import { prisma } from '../utils/db';

export interface UpdateProfileInput {
  preferredStyle?: string;
  academicGoal?: string;
}

export class MentorProfileService {
  /**
   * Get or create student learning profile with aggregated real application statistics
   */
  static async getStudentProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        createdAt: true,
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Ensure profile record exists
    let profile = await prisma.learningProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      profile = await prisma.learningProfile.create({
        data: {
          userId,
          preferredStyle: 'ANALOGY',
          academicGoal: 'Mastering core concepts through interactive AI mentorship'
        }
      });
    }

    // Real DB Aggregations
    const [
      totalDocuments,
      readyDocuments,
      totalChatSessions,
      totalChatMessages,
      quizAttempts,
      recentDocs,
      recentChats
    ] = await Promise.all([
      prisma.document.count({ where: { userId } }),
      prisma.document.count({ where: { userId, status: 'READY' } }),
      prisma.chatSession.count({ where: { userId } }),
      prisma.chatMessage.count({
        where: { session: { userId } }
      }),
      prisma.quizAttempt.findMany({
        where: { userId },
        include: {
          quiz: {
            select: { title: true, document: { select: { filename: true } } }
          }
        },
        orderBy: { startedAt: 'desc' }
      }),
      prisma.document.findMany({
        where: { userId, status: 'READY' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, filename: true, updatedAt: true }
      }),
      prisma.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          _count: { select: { messages: true } }
        }
      })
    ]);

    // Calculate real average quiz score
    const completedAttempts = quizAttempts.filter(a => a.completedAt !== null);
    const averageQuizScore = completedAttempts.length > 0
      ? Math.round(completedAttempts.reduce((acc, curr) => acc + curr.score, 0) / completedAttempts.length)
      : null;

    // Derived Topic Performance from Real Quizzes
    const topicsNeedingPractice: { title: string; score: number }[] = [];
    const strongTopics: { title: string; score: number }[] = [];

    completedAttempts.forEach(attempt => {
      const topicName = attempt.quiz.title;
      if (attempt.score < 70) {
        if (!topicsNeedingPractice.some(t => t.title === topicName)) {
          topicsNeedingPractice.push({ title: topicName, score: attempt.score });
        }
      } else {
        if (!strongTopics.some(t => t.title === topicName)) {
          strongTopics.push({ title: topicName, score: attempt.score });
        }
      }
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      profile: {
        preferredStyle: profile.preferredStyle,
        academicGoal: profile.academicGoal || 'Continuous Learning',
        updatedAt: profile.updatedAt,
      },
      stats: {
        totalDocuments,
        readyDocuments,
        totalChatSessions,
        totalChatMessages,
        totalQuizzesAttempted: completedAttempts.length,
        averageQuizScore,
      },
      activity: {
        recentDocuments: recentDocs,
        recentConversations: recentChats.map(c => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updatedAt,
          messageCount: c._count.messages
        })),
        recentQuizAttempts: completedAttempts.slice(0, 5).map(q => ({
          id: q.id,
          quizTitle: q.quiz.title,
          documentName: q.quiz.document.filename,
          score: q.score,
          completedAt: q.completedAt
        }))
      },
      mastery: {
        topicsNeedingPractice,
        strongTopics
      }
    };
  }

  /**
   * Update student profile preferences
   */
  static async updateStudentProfile(userId: string, input: UpdateProfileInput) {
    const existing = await prisma.learningProfile.findUnique({ where: { userId } });

    if (!existing) {
      return prisma.learningProfile.create({
        data: {
          userId,
          preferredStyle: input.preferredStyle || 'ANALOGY',
          academicGoal: input.academicGoal || ''
        }
      });
    }

    return prisma.learningProfile.update({
      where: { userId },
      data: {
        ...(input.preferredStyle && { preferredStyle: input.preferredStyle }),
        ...(input.academicGoal !== undefined && { academicGoal: input.academicGoal })
      }
    });
  }
}
