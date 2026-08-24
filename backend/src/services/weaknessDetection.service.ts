import { prisma } from '../utils/db';
import { MemoryCategory } from '@prisma/client';
import { RecommendationService } from './recommendation.service';

export interface FormattedWeakness {
  id: string;
  topicName: string;
  masteryLevel: number;
  masteryLabel: 'WEAK' | 'NEEDS_PRACTICE' | 'GOOD' | 'STRONG';
  quizzesTaken: number;
  totalQuestions: number;
  correctAnswers: number;
  evidenceSummary: string;
  color: string;
  textColor: string;
  lastAssessedAt: string;
}

export class WeaknessDetectionService {
  /**
   * Processes a completed quiz attempt and updates topic performance & recommendations.
   */
  static async processQuizAttempt(userId: string, attemptId: string) {
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        quiz: {
          include: {
            document: true,
            questions: true
          }
        },
        answers: true
      }
    });

    if (!attempt || !attempt.quiz) {
      return null;
    }

    // Determine topic name from quiz title or document filename
    let rawTopicName = attempt.quiz.document?.filename || attempt.quiz.title || 'General Computer Science';
    // Clean topic name (remove .pdf extension if present)
    const topicName = rawTopicName.replace(/\.pdf$/i, '').trim();

    const correctCount = attempt.answers.filter(a => a.isCorrect).length;
    const totalAns = attempt.answers.length;

    // Fetch existing TopicPerformance or create default
    const existing = await prisma.topicPerformance.findUnique({
      where: {
        userId_topicName: {
          userId,
          topicName
        }
      }
    });

    const newQuizzesTaken = (existing?.quizzesTaken || 0) + 1;
    const newTotalQuestions = (existing?.totalQuestions || 0) + totalAns;
    const newCorrectAnswers = (existing?.correctAnswers || 0) + correctCount;
    const accuracyRatio = newTotalQuestions > 0 ? (newCorrectAnswers / newTotalQuestions) : 0;
    
    const activeConfusions = await prisma.learningMemory.count({
      where: {
        userId,
        topic: { contains: topicName, mode: 'insensitive' },
        category: { in: [MemoryCategory.CONCEPT_CONFUSION, MemoryCategory.REPEATED_MISTAKE] }
      }
    });

    // Compute Mastery Score (0 to 100)
    let rawMastery = Math.round(accuracyRatio * 100 - (activeConfusions * 10));
    const masteryLevel = Math.max(0, Math.min(100, rawMastery));

    // Determine label & evidence summary
    let label: 'WEAK' | 'NEEDS_PRACTICE' | 'GOOD' | 'STRONG' = 'GOOD';
    if (masteryLevel < 40) label = 'WEAK';
    else if (masteryLevel < 65) label = 'NEEDS_PRACTICE';
    else if (masteryLevel < 85) label = 'GOOD';
    else label = 'STRONG';

    let evidenceSummary = `Marked ${label} (${masteryLevel}% mastery) based on ${newQuizzesTaken} quiz attempt(s) (${newCorrectAnswers}/${newTotalQuestions} correct)`;
    if (activeConfusions > 0) {
      evidenceSummary += ` and ${activeConfusions} active concept confusion(s).`;
    } else {
      evidenceSummary += `.`;
    }

    // Upsert TopicPerformance
    const updatedPerformance = await prisma.topicPerformance.upsert({
      where: {
        userId_topicName: {
          userId,
          topicName
        }
      },
      update: {
        masteryLevel,
        quizzesTaken: newQuizzesTaken,
        totalQuestions: newTotalQuestions,
        correctAnswers: newCorrectAnswers,
        evidenceSummary,
        lastAssessedAt: new Date()
      },
      create: {
        userId,
        topicName,
        masteryLevel,
        quizzesTaken: newQuizzesTaken,
        totalQuestions: newTotalQuestions,
        correctAnswers: newCorrectAnswers,
        evidenceSummary,
        lastAssessedAt: new Date()
      }
    });

    // Generate updated recommendations based on latest weakness data
    await RecommendationService.generateRecommendationsForUser(userId);

    return updatedPerformance;
  }

  /**
   * Retrieves all topic performance items for a user, sorted by lowest mastery level.
   */
  static async getUserWeaknesses(userId: string): Promise<FormattedWeakness[]> {
    const performances = await prisma.topicPerformance.findMany({
      where: { userId },
      orderBy: { masteryLevel: 'asc' }
    });

    return performances.map(p => {
      let masteryLabel: 'WEAK' | 'NEEDS_PRACTICE' | 'GOOD' | 'STRONG' = 'GOOD';
      let color = 'bg-blue-500';
      let textColor = 'text-blue-500';

      if (p.masteryLevel < 40) {
        masteryLabel = 'WEAK';
        color = 'bg-red-500';
        textColor = 'text-red-500';
      } else if (p.masteryLevel < 65) {
        masteryLabel = 'NEEDS_PRACTICE';
        color = 'bg-orange-500';
        textColor = 'text-orange-500';
      } else if (p.masteryLevel < 85) {
        masteryLabel = 'GOOD';
        color = 'bg-blue-500';
        textColor = 'text-blue-500';
      } else {
        masteryLabel = 'STRONG';
        color = 'bg-green-500';
        textColor = 'text-green-500';
      }

      return {
        id: p.id,
        topicName: p.topicName,
        masteryLevel: Math.round(p.masteryLevel),
        masteryLabel,
        quizzesTaken: p.quizzesTaken,
        totalQuestions: p.totalQuestions,
        correctAnswers: p.correctAnswers,
        evidenceSummary: p.evidenceSummary || `Mastery score: ${Math.round(p.masteryLevel)}%`,
        color,
        textColor,
        lastAssessedAt: p.lastAssessedAt.toISOString()
      };
    });
  }
}
