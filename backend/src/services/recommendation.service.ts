import { prisma } from '../utils/db';

export class RecommendationService {
  /**
   * Scans user weak topics and generates targeted recommendations.
   */
  static async generateRecommendationsForUser(userId: string) {
    // 1. Fetch weak/needs_practice topics (mastery < 65)
    const weakTopics = await prisma.topicPerformance.findMany({
      where: {
        userId,
        masteryLevel: { lt: 65 }
      },
      orderBy: { masteryLevel: 'asc' },
      take: 5
    });

    if (weakTopics.length === 0) {
      return [];
    }

    // 2. Fetch user's ready documents
    const userDocs = await prisma.document.findMany({
      where: { userId, status: 'READY' },
      include: { quizzes: true }
    });

    const recommendationsToCreate = [];

    for (const wt of weakTopics) {
      // Find matching document if available
      const matchingDoc = userDocs.find(d => 
        d.filename.toLowerCase().includes(wt.topicName.toLowerCase()) ||
        wt.topicName.toLowerCase().includes(d.filename.replace(/\.pdf$/i, '').toLowerCase())
      ) || userDocs[0]; // fallback to first ready doc if available

      const targetDocId = matchingDoc?.id;
      const targetQuizId = matchingDoc?.quizzes?.[0]?.id;

      const title = `Targeted Practice: ${wt.topicName}`;
      const reason = `Your mastery in ${wt.topicName} is ${Math.round(wt.masteryLevel)}%. ${
        targetQuizId 
          ? 'Take a practice quiz on your study notes to strengthen this concept.' 
          : 'Generate a practice quiz or ask the AI Mentor to explain this topic.'
      }`;
      const actionType = targetQuizId ? 'PRACTICE_QUIZ' : 'REVISE_DOCUMENT';
      const targetId = targetQuizId || targetDocId || null;

      // Check if active recommendation already exists
      const existingRec = await prisma.recommendation.findFirst({
        where: {
          userId,
          topicName: wt.topicName,
          isDismissed: false
        }
      });

      if (!existingRec) {
        recommendationsToCreate.push({
          userId,
          topicName: wt.topicName,
          title,
          reason,
          actionType,
          targetId
        });
      }
    }

    if (recommendationsToCreate.length > 0) {
      await prisma.recommendation.createMany({
        data: recommendationsToCreate
      });
    }

    return prisma.recommendation.findMany({
      where: { userId, isDismissed: false },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Retrieves active, non-dismissed recommendations for a user.
   */
  static async getUserRecommendations(userId: string) {
    // Generate fresh recommendations if none exist
    const count = await prisma.recommendation.count({
      where: { userId, isDismissed: false }
    });

    if (count === 0) {
      await this.generateRecommendationsForUser(userId);
    }

    return prisma.recommendation.findMany({
      where: { userId, isDismissed: false },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Marks a recommendation card as dismissed.
   */
  static async dismissRecommendation(userId: string, recommendationId: string) {
    const rec = await prisma.recommendation.findFirst({
      where: { id: recommendationId, userId }
    });

    if (!rec) {
      throw new Error('Recommendation not found or access denied');
    }

    return prisma.recommendation.update({
      where: { id: recommendationId },
      data: { isDismissed: true }
    });
  }
}
