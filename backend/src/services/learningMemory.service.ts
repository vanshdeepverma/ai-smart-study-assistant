import { prisma } from '../utils/db';
import { MemoryCategory, LearningMemory } from '@prisma/client';
import { getAIProvider } from './chat.service';
import { z } from 'zod';

export interface CreateMemoryInput {
  topic: string;
  category: MemoryCategory;
  content: string;
  confidence: number; // 0.0 to 1.0
  evidence?: string;
}

const ExtractedMemoryItemSchema = z.object({
  topic: z.string(),
  category: z.enum(['CONCEPT_CONFUSION', 'REPEATED_MISTAKE', 'LEARNING_STRENGTH', 'STUDY_PREFERENCE']),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().optional()
});

const ExtractedMemoriesResponseSchema = z.object({
  memories: z.array(ExtractedMemoryItemSchema)
});

export class LearningMemoryService {
  /**
   * Create or update a learning memory with confidence threshold & deduplication
   */
  static async createOrUpdateMemory(userId: string, input: CreateMemoryInput): Promise<LearningMemory | null> {
    // Step 5: Confidence Threshold (Must be >= 0.70)
    if (input.confidence < 0.70) {
      console.log(`[LearningMemoryService] Confidence ${input.confidence} < 0.70 threshold. Skipping memory persistence.`);
      return null;
    }

    const sanitizedTopic = input.topic.trim();
    const sanitizedContent = input.content.trim();

    // Step 6: Deduplication logic
    // Check if an active memory exists for this user, topic, and category
    const existing = await prisma.learningMemory.findFirst({
      where: {
        userId,
        category: input.category,
        isResolved: false,
        topic: {
          equals: sanitizedTopic,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      // Update existing memory rather than creating duplicate record
      return prisma.learningMemory.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          confidence: Math.max(existing.confidence, input.confidence),
          evidence: input.evidence || existing.evidence,
          content: input.confidence >= existing.confidence ? sanitizedContent : existing.content
        }
      });
    }

    // Create new memory record
    return prisma.learningMemory.create({
      data: {
        userId,
        topic: sanitizedTopic,
        category: input.category,
        content: sanitizedContent,
        confidence: input.confidence,
        evidence: input.evidence || null,
        isResolved: false
      }
    });
  }

  /**
   * Extract learning memories from student interaction text using Gemini JSON mode
   */
  static async extractMemoriesFromInteraction(userId: string, userText: string, assistantReply?: string): Promise<LearningMemory[]> {
    if (!userText || userText.trim().length < 10) {
      return [];
    }

    const prompt = `You are an educational learning pattern analyzer for an AI Study Mentor.
Analyze the following student interaction for durable learning signals (conceptual confusions, repeated mistakes, learning strengths, or explicit study preferences).

STUDENT INTERACTION:
Student: "${userText}"
${assistantReply ? `Mentor: "${assistantReply}"` : ''}

INSTRUCTIONS:
1. Extract ONLY clear, high-evidence learning observations.
2. Ignore casual conversation, greetings, and generic questions.
3. Assign a realistic confidence score between 0.0 and 1.0.
4. Categorize into: CONCEPT_CONFUSION, REPEATED_MISTAKE, LEARNING_STRENGTH, or STUDY_PREFERENCE.

Return ONLY valid JSON matching this schema:
{
  "memories": [
    {
      "topic": "Topic Name (e.g. Computer Networks)",
      "category": "CONCEPT_CONFUSION",
      "content": "Description of student confusion or pattern",
      "confidence": 0.85,
      "evidence": "Quoted evidence from student message"
    }
  ]
}`;

    try {
      const provider = getAIProvider();
      const rawJson = await provider.generateJson(prompt);
      const parsedData = JSON.parse(rawJson);
      const validated = ExtractedMemoriesResponseSchema.parse(parsedData);

      const persistedMemories: LearningMemory[] = [];
      for (const item of validated.memories) {
        const saved = await this.createOrUpdateMemory(userId, {
          topic: item.topic,
          category: item.category as MemoryCategory,
          content: item.content,
          confidence: item.confidence,
          evidence: item.evidence
        });
        if (saved) {
          persistedMemories.push(saved);
        }
      }

      return persistedMemories;
    } catch (error) {
      console.warn('[LearningMemoryService] Memory extraction failed or returned no candidates:', error);
      return [];
    }
  }

  /**
   * Get all memories for a user, enforcing multi-tenant isolation
   */
  static async getMemoriesForUser(userId: string, isResolved?: boolean) {
    return prisma.learningMemory.findMany({
      where: {
        userId,
        ...(isResolved !== undefined ? { isResolved } : {})
      },
      orderBy: { lastSeenAt: 'desc' }
    });
  }

  /**
   * Get single memory by ID, enforcing user ownership
   */
  static async getMemoryById(userId: string, memoryId: string) {
    const memory = await prisma.learningMemory.findFirst({
      where: { id: memoryId, userId }
    });
    if (!memory) {
      throw new Error('Learning memory not found');
    }
    return memory;
  }

  /**
   * Toggle memory resolution status (Step 7: Memory Decay/Resolution)
   */
  static async setMemoryResolution(userId: string, memoryId: string, isResolved: boolean) {
    await this.getMemoryById(userId, memoryId); // Ownership check

    return prisma.learningMemory.update({
      where: { id: memoryId },
      data: { isResolved }
    });
  }

  /**
   * Delete a learning memory (Step 12: Student Control & Privacy)
   */
  static async deleteMemory(userId: string, memoryId: string) {
    await this.getMemoryById(userId, memoryId); // Ownership check

    return prisma.learningMemory.delete({
      where: { id: memoryId }
    });
  }

  /**
   * Retrieve active memories relevant to a chat query for prompt injection (Step 10)
   */
  static async findRelevantMemoriesForQuery(userId: string, queryText: string, limit = 5): Promise<LearningMemory[]> {
    const activeMemories = await prisma.learningMemory.findMany({
      where: {
        userId,
        isResolved: false,
        confidence: { gte: 0.70 }
      },
      orderBy: [
        { confidence: 'desc' },
        { lastSeenAt: 'desc' }
      ]
    });

    if (activeMemories.length === 0) {
      return [];
    }

    const lowerQuery = queryText.toLowerCase();

    // Filter memories matching query keywords or topic
    const relevant = activeMemories.filter(mem => {
      const topicLower = mem.topic.toLowerCase();
      const contentLower = mem.content.toLowerCase();
      const keywords = topicLower.split(' ').concat(contentLower.split(' '));
      return keywords.some(k => k.length > 3 && lowerQuery.includes(k));
    });

    // If query matches specific topic memories, return them; otherwise return top general active memories
    const selected = relevant.length > 0 ? relevant : activeMemories;
    return selected.slice(0, limit);
  }
}
