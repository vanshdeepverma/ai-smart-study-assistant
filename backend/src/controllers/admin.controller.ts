import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { ApiResponse } from '../utils/ApiResponse';

export class AdminController {
  /**
   * Get system-wide statistics for the admin dashboard
   */
  static async getSystemStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const totalUsers = await prisma.user.count();
      const totalDocuments = await prisma.document.count();
      const totalQuizzes = await prisma.quizAttempt.count();
      const totalStudyTimeMinutes = await prisma.studySession.aggregate({
        _sum: { duration: true }
      });

      const stats = {
        totalUsers,
        totalDocuments,
        totalQuizzes,
        totalStudyHours: Math.floor((totalStudyTimeMinutes._sum.duration || 0) / 60)
      };

      return res.status(200).json(ApiResponse.success(stats, 'System stats retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a list of all users with pagination
   */
  static async getUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: {
            select: { documents: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Simple limit for now
      });

      return res.status(200).json(ApiResponse.success(users, 'Users retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }
}
