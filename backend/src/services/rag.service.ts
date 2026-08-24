import { prisma } from '../utils/db';
import { GoogleGenAI } from '@google/genai';
import { Prisma } from '@prisma/client';

export interface RAGContext {
  id: string;
  documentId: string;
  content: string;
  pageNumber: number | null;
  filename: string;
  similarity: number;
}

export class RAGService {
  private static aiInstance: GoogleGenAI | null = null;
  private static EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  private static EMBEDDING_DIM = 768;

  private static getAI(): GoogleGenAI {
    if (!this.aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your-gemini-api-key') {
        throw new Error('GEMINI_API_KEY is not set or invalid in backend environment variables.');
      }
      this.aiInstance = new GoogleGenAI({ apiKey });
    }
    return this.aiInstance;
  }

  /**
   * Generates 768-dim embeddings for an array of texts using GoogleGenAI.
   */
  static async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];
    
    try {
      const ai = this.getAI();
      const response = await ai.models.embedContent({
        model: this.EMBEDDING_MODEL,
        contents: texts,
        config: {
          outputDimensionality: this.EMBEDDING_DIM
        }
      });

      if (!response.embeddings || response.embeddings.length === 0) {
        throw new Error('Gemini API returned no embeddings');
      }

      return response.embeddings.map(e => e.values || []);
    } catch (error) {
      console.error('[RAGService] Failed to generate embeddings via Gemini:', error);
      throw error;
    }
  }

  /**
   * Generates an embedding for a single text string.
   */
  static async getEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.getEmbeddings([text]);
    return embeddings[0] || [];
  }

  /**
   * Performs a vector similarity search in PostgreSQL via pgvector to find relevant document chunks.
   * STRICT SECURITY: Only queries documents belonging to the specified userId.
   * OPTIONAL DOCUMENT FOCUS: If documentId is provided, restricts vector search ONLY to that document.
   */
  static async findSimilarChunks(
    userId: string, 
    queryText: string, 
    limit = 5,
    documentId?: string | null
  ): Promise<RAGContext[]> {
    if (!queryText || !queryText.trim()) return [];

    // 1. Generate 768-dim query embedding
    const queryEmbedding = await this.getEmbedding(queryText);
    if (!queryEmbedding || queryEmbedding.length === 0) return [];

    // 2. Format embedding for pgvector syntax: '[val1, val2, ...]'
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // 3. Optional SQL clause for single document focus
    const documentFilterSql = documentId 
      ? Prisma.sql`AND d.id = ${documentId}` 
      : Prisma.empty;

    // 4. Raw SQL query using cosine distance (<=>)
    // Strictly joins Document and filters WHERE d."userId" = ${userId}
    const similarChunks = await prisma.$queryRaw<any[]>`
      SELECT 
        dc.id, 
        dc."documentId", 
        dc.content, 
        dc."pageNumber", 
        d.filename,
        1 - (dc.embedding <=> ${embeddingString}::vector) as similarity
      FROM "DocumentChunk" dc
      JOIN "Document" d ON dc."documentId" = d.id
      WHERE d."userId" = ${userId}
        AND d.status = 'READY'
        AND dc.embedding IS NOT NULL
        ${documentFilterSql}
      ORDER BY dc.embedding <=> ${embeddingString}::vector
      LIMIT ${limit};
    `;

    return similarChunks.map(chunk => ({
      ...chunk,
      similarity: Number(chunk.similarity)
    }));
  }
}
