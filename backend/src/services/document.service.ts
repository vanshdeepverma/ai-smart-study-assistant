import { prisma } from '../utils/db';
import { DocumentStatus } from '@prisma/client';
import { StorageFactory } from './storage/StorageFactory';
import { PdfProcessingService } from './pdfProcessing.service';
import { RAGService } from './rag.service';
import fs from 'fs';

export class DocumentService {
  /**
   * Starts tracking the document in the DB
   */
  static async createDocumentRecord(userId: string, originalName: string, savedFilename: string, fileSize: number) {
    return prisma.document.create({
      data: {
        userId,
        filename: originalName, // User-facing name
        fileUrl: `/uploads/documents/${originalName}`, // Placeholder URL (or S3 pre-signed if we wanted to build it)
        status: DocumentStatus.PROCESSING,
        metadata: {
          size: fileSize,
          storageKey: savedFilename,
        },
      },
    });
  }

  /**
   * Asynchronously processes the PDF and updates the DB
   */
  static async processDocument(documentId: string, storageKey: string) {
    let tempFilePath: string | null = null;
    try {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      const existingMeta = (doc?.metadata as object) || {};

      // 1. Download to temporary local file
      const storageService = StorageFactory.getService();
      tempFilePath = await storageService.downloadToTemp(storageKey);

      // 2. Extract text
      const { text, pages } = await PdfProcessingService.extractText(tempFilePath);
      
      // 2. Chunk text
      const chunks = PdfProcessingService.chunkText(text);

      // 3. Get embeddings for chunks (mandatory for RAG)
      const embeddings = await RAGService.getEmbeddings(chunks);
      if (embeddings.length !== chunks.length) {
        throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`);
      }

      // 4. Save chunks + embeddings transactionally
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < chunks.length; i++) {
          const embeddingString = `[${embeddings[i].join(',')}]`;
          await tx.$executeRaw`
            INSERT INTO "DocumentChunk" ("id", "documentId", "content", "pageNumber", "embedding")
            VALUES (gen_random_uuid(), ${documentId}, ${chunks[i]}, null, ${embeddingString}::vector)
          `;
        }

        // Update Document status to READY
        await tx.document.update({
          where: { id: documentId },
          data: {
            status: DocumentStatus.READY,
            metadata: {
              ...existingMeta,
              pages,
              totalChunks: chunks.length,
            },
          },
        });
      });
    } catch (error) {
      console.error(`Failed to process document ${documentId}:`, error);
      // Mark as ERROR
      const errorDoc = await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.ERROR },
      });
      // Cleanup the orphaned file
      const errorMeta = errorDoc.metadata as { savedFilename?: string; storageKey?: string };
      const key = errorMeta?.storageKey || errorMeta?.savedFilename;
      if (key) {
        await StorageFactory.getService().deleteFile(key);
      }
    } finally {
      // Clean up temporary local file used for processing
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  /**
   * Get all documents for a user
   */
  static async getUserDocuments(userId: string) {
    return prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        status: true,
        createdAt: true,
        metadata: true,
      }
    });
  }

  /**
   * Get specific document, enforcing ownership
   */
  static async getDocumentById(userId: string, documentId: string) {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId },
      include: {
        _count: {
          select: { chunks: true }
        }
      }
    });

    if (!doc) throw new Error('Document not found');
    return doc;
  }

  /**
   * Delete document, enforcing ownership
   */
  static async deleteDocument(userId: string, documentId: string) {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!doc) throw new Error('Document not found');

    // Remove file physically
    const metadata = doc.metadata as { savedFilename?: string; storageKey?: string };
    const key = metadata?.storageKey || metadata?.savedFilename;
    if (key) {
      await StorageFactory.getService().deleteFile(key);
    }

    // Remove DB record (Cascade deletes DocumentChunk automatically)
    await prisma.document.delete({
      where: { id: documentId },
    });
  }
}
