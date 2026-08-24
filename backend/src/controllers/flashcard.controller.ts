import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { ApiResponse } from '../utils/ApiResponse';
import { FlashcardService } from '../services/flashcard.service';

export class FlashcardController {
  /**
   * Get all flashcards for the authenticated user
   */
  static async getFlashcards(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      
      const flashcards = await prisma.flashcard.findMany({
        where: {
          document: {
            userId
          }
        },
        include: {
          document: {
            select: { filename: true }
          },
          progress: {
            where: {
              userId
            },
            select: {
              rating: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json(ApiResponse.success(flashcards, 'Flashcards retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate flashcards from a document
   */
  static async generateFlashcards(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { documentId, difficulty } = req.body;

      if (!documentId) {
        return res.status(400).json(ApiResponse.error('documentId is required', '400'));
      }

      const flashcards = await FlashcardService.generateFlashcards(userId, documentId, difficulty);
      return res.status(201).json(ApiResponse.success(flashcards, 'Flashcards generated successfully'));
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_CONTENT') {
        return res.status(400).json(ApiResponse.error('Not enough information was found in this document to generate flashcards.', '400'));
      }
      if (error.message === 'AI_QUOTA_EXCEEDED') {
        return res.status(429).json(ApiResponse.error('AI usage limit reached. Please try again later.', '429'));
      }
      if (error.message === 'Document not found or not in READY status') {
        return res.status(404).json(ApiResponse.error(error.message, '404'));
      }
      if (error.message.includes('Failed to generate valid educational flashcards')) {
        return res.status(400).json(ApiResponse.error(error.message, '400'));
      }
      next(error);
    }
  }

  /**
   * Delete a flashcard
   */
  static async deleteFlashcard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;

      await FlashcardService.deleteFlashcard(userId, id);
      return res.status(200).json(ApiResponse.success(null, 'Flashcard deleted successfully'));
    } catch (error: any) {
      if (error.message === 'Flashcard not found or access denied') {
        return res.status(404).json(ApiResponse.error(error.message, '404'));
      }
      next(error);
    }
  }

  /**
   * Rate a flashcard
   */
  static async rateFlashcard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const { rating } = req.body;

      if (!['HARD', 'GOOD', 'EASY'].includes(rating)) {
        return res.status(400).json(ApiResponse.error('Invalid rating. Must be HARD, GOOD, or EASY.', '400'));
      }

      const progress = await FlashcardService.rateFlashcard(userId, id, rating);
      return res.status(200).json(ApiResponse.success(progress, 'Flashcard rated successfully'));
    } catch (error: any) {
      if (error.message === 'Flashcard not found or access denied') {
        return res.status(404).json(ApiResponse.error(error.message, '404'));
      }
      next(error);
    }
  }
}
