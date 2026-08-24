import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { ApiResponse } from '../utils/ApiResponse';

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
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json(ApiResponse.success(flashcards, 'Flashcards retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }
}
