import { Request, Response, NextFunction } from 'express';
import { LearningMemoryService } from '../services/learningMemory.service';
import { ApiResponse } from '../utils/ApiResponse';

export class LearningMemoryController {
  /**
   * GET /api/v1/mentor/memories
   */
  static async getMemories(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const isResolved = req.query.isResolved !== undefined ? req.query.isResolved === 'true' : undefined;
      const memories = await LearningMemoryService.getMemoriesForUser(userId, isResolved);
      return res.status(200).json(ApiResponse.success(memories, 'Learning memories retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/mentor/memories/:id
   */
  static async getMemoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const memoryId = req.params.id as string;
      const memory = await LearningMemoryService.getMemoryById(userId, memoryId);
      return res.status(200).json(ApiResponse.success(memory, 'Learning memory retrieved successfully'));
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return res.status(404).json(ApiResponse.error(error.message, 'NOT_FOUND'));
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/mentor/memories
   */
  static async createMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { topic, category, content, confidence, evidence } = req.body;

      if (!topic || !category || !content) {
        return res.status(400).json(ApiResponse.error('topic, category, and content are required', 'VALIDATION_ERROR'));
      }

      const memory = await LearningMemoryService.createOrUpdateMemory(userId, {
        topic,
        category,
        content,
        confidence: confidence !== undefined ? Number(confidence) : 0.85,
        evidence
      });

      if (!memory) {
        return res.status(400).json(ApiResponse.error('Memory confidence was below required 0.70 threshold', 'CONFIDENCE_TOO_LOW'));
      }

      return res.status(201).json(ApiResponse.success(memory, 'Learning memory created successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/mentor/memories/:id
   */
  static async updateMemoryResolution(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const memoryId = req.params.id as string;
      const { isResolved } = req.body;

      if (typeof isResolved !== 'boolean') {
        return res.status(400).json(ApiResponse.error('isResolved boolean parameter is required', 'VALIDATION_ERROR'));
      }

      const updated = await LearningMemoryService.setMemoryResolution(userId, memoryId, isResolved);
      return res.status(200).json(ApiResponse.success(updated, 'Memory resolution updated successfully'));
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return res.status(404).json(ApiResponse.error(error.message, 'NOT_FOUND'));
      }
      next(error);
    }
  }

  /**
   * DELETE /api/v1/mentor/memories/:id
   */
  static async deleteMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const memoryId = req.params.id as string;
      await LearningMemoryService.deleteMemory(userId, memoryId);
      return res.status(200).json(ApiResponse.success(null, 'Learning memory deleted successfully'));
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return res.status(404).json(ApiResponse.error(error.message, 'NOT_FOUND'));
      }
      next(error);
    }
  }
}
