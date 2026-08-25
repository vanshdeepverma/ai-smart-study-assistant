import { prisma } from '../utils/db';
import { getAIProvider } from './chat.service';
import { z } from 'zod';

export const GeneratedFlashcardSchema = z.object({
  front: z.string().min(1, 'Question/Front cannot be empty'),
  back: z.string().min(1, 'Answer/Back cannot be empty')
});

export const GeneratedFlashcardsSchema = z.object({
  flashcards: z.array(GeneratedFlashcardSchema).min(1, 'At least 1 flashcard is required').max(20)
});

export class FlashcardService {
  /**
   * Generates structured flashcards from an uploaded READY document using Gemini.
   */
  static async generateFlashcards(
    userId: string,
    documentId: string,
    difficulty: string = 'MEDIUM'
  ) {
    // 1. Verify document ownership & READY status
    const doc = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
        status: 'READY'
      },
      include: {
        chunks: true
      }
    });

    if (!doc) {
      throw new Error('Document not found or not in READY status');
    }

    if (!doc.chunks || doc.chunks.length === 0) {
      throw new Error('INSUFFICIENT_CONTENT');
    }

    // Combine chunk text (bounded to 12,000 characters to fit context cleanly)
    const combinedContent = doc.chunks.map(c => c.content).join('\n\n').slice(0, 12000);

    if (combinedContent.trim().length < 20) {
      throw new Error('INSUFFICIENT_CONTENT');
    }

    // 2. We will implement a retry loop (max 3 attempts) to generate valid flashcards.
    let validFlashcards: Array<{ front: string; back: string }> = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
      // Build prompt for Gemini structured JSON output
      const prompt = `You are an expert educational tutor. Generate up to 10 high-quality flashcards based ONLY on the actual educational/content material in the provided study content.

DIFFICULTY LEVEL: ${difficulty}

CRITICAL RULES FOR FLASHCARD GENERATION:
1. Flashcards MUST test the student's understanding of concepts, definitions, principles, formulas, examples, or important facts from the content.
2. You MUST NOT generate flashcards about document metadata.
3. ABSOLUTELY FORBIDDEN TOPICS: total number of pages, filename, document name, file name, file size, upload date, number of chunks, document ID, UUID, processing status, vector embeddings, chunk count.
4. Every flashcard must be something a student can learn by studying the educational material.
5. If the material does not contain enough information, generate as many valid flashcards as possible (even if it's less than 10).
6. Format the "back" of the flashcard to be clear and concise. If an explanation is needed, include it inside the "back" field.

STUDY CONTENT:
${combinedContent}

JSON SCHEMA INSTRUCTIONS:
Return a JSON object containing:
- "flashcards": An array of flashcard objects.
  Each flashcard object MUST contain:
  - "front": The question or prompt string.
  - "back": The complete answer string (can include a brief explanation if helpful).`;

      // 3. Call AI Provider for JSON output
      const provider = getAIProvider();
      const rawJson = await provider.generateJson(prompt, { temperature: 0.3 });

      // Clean potential markdown wrap
      const cleanedJson = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

      let parsedData: any;
      try {
        parsedData = JSON.parse(cleanedJson);
      } catch (parseErr) {
        console.warn(`[FlashcardService] Attempt ${attempt}: Failed to parse raw AI JSON output`);
        continue;
      }

      // 4. Validate with Zod Schema
      let validatedData;
      try {
        validatedData = GeneratedFlashcardsSchema.parse(parsedData);
      } catch (validationErr) {
        console.warn(`[FlashcardService] Attempt ${attempt}: Zod schema validation failed`);
        continue;
      }

      // 5. Automatic Validation against Metadata Questions
      const BAD_PATTERNS = [
        /how many pages/i, /total number of pages/i, /number of pages/i,
        /document name/i, /file name/i, /filename/i, /file size/i,
        /upload date/i, /document id/i, /uuid/i, /processing status/i,
        /chunks/i, /chunk count/i, /document structure/i, /metadata/i
      ];

      const currentValidCards = validatedData.flashcards.filter(card => {
        const frontText = card.front.toLowerCase();
        return !BAD_PATTERNS.some(regex => regex.test(frontText));
      });

      validFlashcards = [...validFlashcards, ...currentValidCards];

      if (validFlashcards.length >= 5) {
        break;
      }
    }

    if (validFlashcards.length === 0) {
      throw new Error('Failed to generate valid educational flashcards. Please try again.');
    }

    // Take exactly up to 10 flashcards
    const finalCards = validFlashcards.slice(0, 10);

    // 6. Store Flashcards in PostgreSQL within transaction
    const savedCards = await prisma.$transaction(async (tx) => {
      const createdCards = [];
      for (const card of finalCards) {
        const created = await tx.flashcard.create({
          data: {
            documentId,
            front: card.front,
            back: card.back
          }
        });
        createdCards.push(created);
      }
      return createdCards;
    });

    return savedCards;
  }

  /**
   * Delete document, enforcing ownership
   */
  static async deleteFlashcard(userId: string, flashcardId: string) {
    const card = await prisma.flashcard.findFirst({
      where: {
        id: flashcardId,
        document: {
          userId
        }
      }
    });

    if (!card) throw new Error('Flashcard not found or access denied');

    await prisma.flashcard.delete({
      where: { id: flashcardId }
    });
  }

  /**
   * Rate a flashcard and save progress
   */
  static async rateFlashcard(userId: string, flashcardId: string, rating: 'HARD' | 'GOOD' | 'EASY') {
    const card = await prisma.flashcard.findFirst({
      where: {
        id: flashcardId,
        document: {
          userId
        }
      }
    });

    if (!card) throw new Error('Flashcard not found or access denied');

    // Create or update FlashcardProgress with the simple rating
    const progress = await prisma.flashcardProgress.upsert({
      where: {
        userId_flashcardId: {
          userId,
          flashcardId
        }
      },
      update: {
        rating,
        nextReview: new Date() // Keeping this minimal for now as requested
      },
      create: {
        userId,
        flashcardId,
        rating
      }
    });

    return progress;
  }
}
