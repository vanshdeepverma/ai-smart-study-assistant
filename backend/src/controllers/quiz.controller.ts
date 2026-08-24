import { Request, Response, NextFunction } from 'express';
import { QuizService } from '../services/quiz.service';
import { ApiResponse } from '../utils/ApiResponse';

export class QuizController {
  /**
   * Get all quizzes for the authenticated user
   */
  static async getQuizzes(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const quizzes = await QuizService.getQuizzesForUser(userId);
      return res.status(200).json(ApiResponse.success(quizzes, 'Quizzes retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific quiz by ID
   */
  static async getQuizById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const quizId = req.params.id as string;
      const quiz = await QuizService.getQuizById(userId, quizId);
      return res.status(200).json(ApiResponse.success(quiz, 'Quiz retrieved successfully'));
    } catch (error: any) {
      if (error.message?.includes('not found') || error.message?.includes('access denied')) {
        return res.status(404).json(ApiResponse.error(error.message, 'NOT_FOUND'));
      }
      next(error);
    }
  }

  /**
   * Generate a new quiz from a document
   */
  static async generateQuiz(req: Request, res: Response, _next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { documentId, difficulty } = req.body;

      if (!documentId) {
        return res.status(400).json(ApiResponse.error('documentId is required to generate quiz', 'BAD_REQUEST'));
      }

      const quiz = await QuizService.generateQuizFromDocument(userId, documentId, difficulty);
      return res.status(201).json(ApiResponse.success(quiz, 'Quiz generated successfully'));
    } catch (error: any) {
      if (error.message?.includes('not found') || error.message?.includes('access denied')) {
        return res.status(404).json(ApiResponse.error(error.message, 'NOT_FOUND'));
      }
      return res.status(400).json(ApiResponse.error(error.message || 'Failed to generate quiz', 'BAD_REQUEST'));
    }
  }

  /**
   * Submit student answers for a quiz attempt
   */
  static async submitAttempt(req: Request, res: Response, _next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const quizId = req.params.id as string;
      const { answers } = req.body;

      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json(ApiResponse.error('Answers array is required', 'BAD_REQUEST'));
      }

      const result = await QuizService.submitQuizAttempt(userId, quizId, answers);
      return res.status(201).json(ApiResponse.success(result, 'Quiz attempt submitted successfully'));
    } catch (error: any) {
      if (error.message?.includes('not found') || error.message?.includes('access denied')) {
        return res.status(404).json(ApiResponse.error(error.message, 'NOT_FOUND'));
      }
      return res.status(400).json(ApiResponse.error(error.message || 'Failed to submit quiz attempt', 'BAD_REQUEST'));
    }
  }
}
