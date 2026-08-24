import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { ApiResponse } from '../utils/ApiResponse';
import { WeaknessDetectionService } from '../services/weaknessDetection.service';
import { RecommendationService } from '../services/recommendation.service';

export class UserController {
  /**
   * Get aggregated dashboard statistics for the authenticated user
   */
  static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      // 1. Total Documents
      const totalDocuments = await prisma.document.count({
        where: { userId }
      });

      // 2. Total Quizzes Taken
      const quizzesTaken = await prisma.quizAttempt.count({
        where: { userId, completedAt: { not: null } }
      });

      // 3. Average Score
      const quizAttempts = await prisma.quizAttempt.findMany({
        where: { userId, completedAt: { not: null } },
        select: { score: true }
      });
      const averageScore = quizAttempts.length > 0 
        ? Math.round(quizAttempts.reduce((acc, curr) => acc + curr.score, 0) / quizAttempts.length)
        : 0;

      // 4. Study Time
      const studySessions = await prisma.studySession.findMany({
        where: { userId }
      });
      const totalMinutes = studySessions.reduce((acc, curr) => acc + curr.duration, 0);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const studyTimeStr = `${hours}h ${minutes}m`;

      // 5. Current Streak & User Details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, name: true }
      });

      // 6. Recent Activity
      const recentDocs = await prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, filename: true, createdAt: true }
      });
      
      const recentActivity = recentDocs.map(doc => ({
        id: doc.id,
        title: `Uploaded ${doc.filename}`,
        timeAgo: doc.createdAt.toISOString() 
      }));

      // 7. Weak Topics from WeaknessDetectionService
      const weaknesses = await WeaknessDetectionService.getUserWeaknesses(userId);
      const weakTopics = weaknesses.map(w => ({
        id: w.id,
        name: w.topicName,
        mastery: w.masteryLevel,
        masteryLabel: w.masteryLabel,
        evidenceSummary: w.evidenceSummary,
        color: w.color,
        text: w.textColor
      }));

      // 8. Active Personalized Recommendations
      const recommendations = await RecommendationService.getUserRecommendations(userId);

      // 9. Active Learning Memories Count
      const activeMemoriesCount = await prisma.learningMemory.count({
        where: { userId, isResolved: false }
      });

      const stats = {
        userName: user?.name || 'Student',
        totalDocuments,
        newDocumentsThisWeek: totalDocuments, 
        quizzesTaken,
        averageScore,
        studyTime: studyTimeStr,
        currentStreak: user?.currentStreak || 0,
        recentActivity,
        weakTopics,
        recommendations,
        activeMemoriesCount
      };

      return res.status(200).json(ApiResponse.success(stats, 'Dashboard stats retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }
}
