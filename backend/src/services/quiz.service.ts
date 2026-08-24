import { prisma } from '../utils/db';
import { getAIProvider } from './chat.service';
import { QuizDifficulty } from '@prisma/client';
import { z } from 'zod';
import { WeaknessDetectionService } from './weaknessDetection.service';

export const QuizQuestionSchema = z.object({
  text: z.string().min(1, 'Question text cannot be empty'),
  options: z.array(z.string().min(1)).length(4, 'Each question must have exactly 4 options'),
  correctAnswer: z.string().min(1, 'Correct answer must be specified'),
  explanation: z.string().min(1, 'Explanation must be provided')
});

export const GeneratedQuizSchema = z.object({
  title: z.string().min(1, 'Quiz title cannot be empty'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  questions: z.array(QuizQuestionSchema).min(1, 'Quiz must contain at least 1 question').max(10)
});

export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;

export class QuizService {
  /**
   * Generates a structured multiple-choice quiz from an uploaded READY document using Gemini.
   */
  static async generateQuizFromDocument(
    userId: string,
    documentId: string,
    difficulty: QuizDifficulty = QuizDifficulty.MEDIUM
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
      throw new Error('Document has no processed text chunks available for quiz generation');
    }

    // Combine chunk text (bounded to 12,000 characters to fit context cleanly)
    const combinedContent = doc.chunks.map(c => c.content).join('\n\n').slice(0, 12000);

    if (combinedContent.trim().length < 20) {
      throw new Error('Document contains insufficient text content to generate a quiz');
    }

    // 2. We will implement a retry loop (max 3 attempts) to generate valid questions.
    let validQuestions: any[] = [];
    let generatedTitle = `${doc.filename} Quiz`;

    for (let attempt = 1; attempt <= 3; attempt++) {
      // Build prompt for Gemini structured JSON output
      const prompt = `You are an expert educational tutor. Generate an 8-question multiple-choice quiz based ONLY on the actual educational/content material in the provided study content.

DIFFICULTY LEVEL: ${difficulty}

CRITICAL RULES FOR QUESTION GENERATION:
1. Questions MUST test the student's understanding of concepts, definitions, principles, formulas, examples, or important facts from the content.
2. You MUST NOT generate questions about document metadata.
3. ABSOLUTELY FORBIDDEN TOPICS: total number of pages, filename, document name, file name, file size, upload date, number of chunks, document ID, UUID, processing status, vector embeddings, chunk count.
4. "How many pages are in this document?" or "What is the name of this PDF?" are strict violations.
5. Every question must be something a student can learn by studying the educational material.

STUDY CONTENT:
${combinedContent}

JSON SCHEMA INSTRUCTIONS:
Return a JSON object containing:
- "title": A concise descriptive educational title for this quiz (do not include file extensions like .pdf).
- "difficulty": "${difficulty}"
- "questions": An array of 8 multiple choice questions.
  Each question object MUST contain:
  - "text": The question string.
  - "options": An array of EXACTLY 4 distinct option strings.
  - "correctAnswer": Must EXACTLY MATCH one of the 4 option strings.
  - "explanation": A clear 1-2 sentence explanation of why the correct answer is right based on the text.`;

      // 3. Call AI Provider for JSON output
      const provider = getAIProvider();
      const rawJson = await provider.generateJson(prompt, { temperature: 0.3 });

      // Clean potential markdown wrap
      const cleanedJson = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

      let parsedData: any;
      try {
        parsedData = JSON.parse(cleanedJson);
      } catch (parseErr) {
        console.warn(`[QuizService] Attempt ${attempt}: Failed to parse raw AI JSON output`);
        continue;
      }

      // 4. Validate with Zod Schema
      let validatedQuiz;
      try {
        validatedQuiz = GeneratedQuizSchema.parse(parsedData);
      } catch (validationErr) {
        console.warn(`[QuizService] Attempt ${attempt}: Zod schema validation failed`);
        continue;
      }

      generatedTitle = validatedQuiz.title || generatedTitle;

      // 5. Automatic Validation against Metadata Questions
      const BAD_PATTERNS = [
        /how many pages/i, /total number of pages/i, /number of pages/i,
        /document name/i, /file name/i, /filename/i, /file size/i, 
        /upload date/i, /document id/i, /uuid/i, /processing status/i, 
        /chunks/i, /chunk count/i, /document structure/i, /metadata/i
      ];

      const currentValidQuestions = validatedQuiz.questions.filter(q => {
        const qText = q.text.toLowerCase();
        return !BAD_PATTERNS.some(regex => regex.test(qText));
      });

      // Add to our pool of valid questions
      validQuestions = [...validQuestions, ...currentValidQuestions];

      // If we have at least 5 valid questions, we can break early
      if (validQuestions.length >= 5) {
        break;
      }
    }

    if (validQuestions.length < 5) {
      console.warn(`[QuizService] Could only generate ${validQuestions.length} valid educational questions. Proceeding with what we have.`);
    }

    if (validQuestions.length === 0) {
      throw new Error('Failed to generate valid educational questions. Please try again.');
    }

    // Take exactly up to 5 questions
    const finalQuestions = validQuestions.slice(0, 5);

    // 6. Store Quiz + Questions in PostgreSQL within transaction
    const savedQuiz = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          documentId,
          title: generatedTitle,
          difficulty: difficulty
        }
      });

      for (const q of finalQuestions) {
        await tx.question.create({
          data: {
            quizId: quiz.id,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer
          }
        });
      }

      return tx.quiz.findUnique({
        where: { id: quiz.id },
        include: {
          document: { select: { filename: true } },
          questions: true
        }
      });
    });

    return savedQuiz;
  }

  /**
   * Retrieves all quizzes accessible to the authenticated user.
   */
  static async getQuizzesForUser(userId: string) {
    return prisma.quiz.findMany({
      where: {
        document: {
          userId
        }
      },
      include: {
        document: {
          select: { id: true, filename: true }
        },
        _count: {
          select: { questions: true, attempts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Gets a specific quiz by ID, enforcing user ownership.
   */
  static async getQuizById(userId: string, quizId: string) {
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        document: {
          userId
        }
      },
      include: {
        document: {
          select: { id: true, filename: true }
        },
        questions: true,
        attempts: {
          where: { userId },
          orderBy: { startedAt: 'desc' },
          include: {
            answers: true
          }
        }
      }
    });

    if (!quiz) {
      throw new Error('Quiz not found or access denied');
    }

    return quiz;
  }

  /**
   * Submits a student attempt, grades options, and persists attempt + answer records.
   */
  static async submitQuizAttempt(
    userId: string,
    quizId: string,
    userAnswers: Array<{ questionId: string; selectedOption: string }>
  ) {
    // 1. Verify quiz ownership
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        document: {
          userId
        }
      },
      include: {
        questions: true
      }
    });

    if (!quiz) {
      throw new Error('Quiz not found or access denied');
    }

    if (!userAnswers || userAnswers.length === 0) {
      throw new Error('Answers are required to submit quiz attempt');
    }

    // Map questions by ID for quick lookup
    const questionMap = new Map(quiz.questions.map(q => [q.id, q]));
    
    let correctCount = 0;
    const answerRecordsToCreate: Array<{ questionId: string; selectedOption: string; isCorrect: boolean }> = [];

    for (const ans of userAnswers) {
      const question = questionMap.get(ans.questionId);
      if (question) {
        const isCorrect = question.correctAnswer.trim().toLowerCase() === ans.selectedOption.trim().toLowerCase();
        if (isCorrect) correctCount++;
        answerRecordsToCreate.push({
          questionId: question.id,
          selectedOption: ans.selectedOption,
          isCorrect
        });
      }
    }

    const totalQuestions = quiz.questions.length;
    const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Persist attempt & answers in transaction
    const attemptResult = await prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.create({
        data: {
          userId,
          quizId,
          score: scorePercentage,
          completedAt: new Date()
        }
      });

      for (const a of answerRecordsToCreate) {
        await tx.answer.create({
          data: {
            attemptId: attempt.id,
            questionId: a.questionId,
            selectedOption: a.selectedOption,
            isCorrect: a.isCorrect
          }
        });
      }

      return tx.quizAttempt.findUnique({
        where: { id: attempt.id },
        include: {
          answers: {
            include: {
              question: true
            }
          }
        }
      });
    });

    if (attemptResult) {
      // Process weakness detection asynchronously
      WeaknessDetectionService.processQuizAttempt(userId, attemptResult.id).catch(err => {
        console.error('[QuizService] Error updating weakness detection after quiz attempt:', err);
      });
    }

    return attemptResult;
  }
}
