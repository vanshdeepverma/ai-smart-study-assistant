import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
// import { QuizService } from '../src/services/quiz.service';
import { getAIProvider } from '../src/services/chat.service';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('P3-A Quiz System API & Security Tests', () => {
  const userAEmail = `quiz_usera_${uuidv4()}@quiztest.com`;
  const userBEmail = `quiz_userb_${uuidv4()}@quiztest.com`;
  
  let userAId: string;
  let userBId: string;
  let cookieA: string;
  let cookieB: string;
  let docAId: string;
  let docBId: string;
  let quizAId: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Password123!', salt);

    // Create User A & User B
    const userA = await prisma.user.create({
      data: { name: 'Quiz User A', email: userAEmail, passwordHash: passHash }
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: { name: 'Quiz User B', email: userBEmail, passwordHash: passHash }
    });
    userBId = userB.id;

    // Login User A
    const loginA = await request(app).post('/api/v1/auth/login').send({ email: userAEmail, password: 'Password123!' });
    cookieA = Array.isArray(loginA.headers['set-cookie']) ? loginA.headers['set-cookie'][0] : loginA.headers['set-cookie'];

    // Login User B
    const loginB = await request(app).post('/api/v1/auth/login').send({ email: userBEmail, password: 'Password123!' });
    cookieB = Array.isArray(loginB.headers['set-cookie']) ? loginB.headers['set-cookie'][0] : loginB.headers['set-cookie'];

    // Create READY Document A for User A
    const docA = await prisma.document.create({
      data: {
        userId: userAId,
        filename: 'Networking_Notes.pdf',
        fileUrl: '/uploads/documents/notesA.pdf',
        status: 'READY',
        chunks: {
          create: [
            { content: 'CSMA/CD protocol detects collisions in Ethernet networks and manages retransmissions using binary exponential backoff.' }
          ]
        }
      }
    });
    docAId = docA.id;

    // Create READY Document B for User B
    const docB = await prisma.document.create({
      data: {
        userId: userBId,
        filename: 'Physics_Notes.pdf',
        fileUrl: '/uploads/documents/notesB.pdf',
        status: 'READY',
        chunks: {
          create: [
            { content: 'Thermodynamics laws govern energy conservation and entropy in physical systems.' }
          ]
        }
      }
    });
    docBId = docB.id;
  });

  afterAll(async () => {
    await prisma.quizAttempt.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.quiz.deleteMany({ where: { documentId: { in: [docAId, docBId] } } });
    await prisma.document.deleteMany({ where: { id: { in: [docAId, docBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await prisma.$disconnect();
  });

  describe('Quiz Generation', () => {
    it('should generate a valid quiz using Gemini JSON output', async () => {
      // Mock generateJson on AIProvider to return valid JSON
      const mockQuizJson = JSON.stringify({
        title: 'Networking CSMA/CD Practice Quiz',
        difficulty: 'MEDIUM',
        questions: [
          {
            text: 'What does CSMA/CD stand for in networking?',
            options: [
              'Carrier Sense Multiple Access with Collision Detection',
              'Central System Media Access Control',
              'Code Segment Memory Allocation',
              'Computer System Main Algorithm'
            ],
            correctAnswer: 'Carrier Sense Multiple Access with Collision Detection',
            explanation: 'CSMA/CD stands for Carrier Sense Multiple Access with Collision Detection.'
          },
          {
            text: 'Question 2',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: 'Explanation'
          },
          {
            text: 'Question 3',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: 'Explanation'
          },
          {
            text: 'Question 4',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: 'Explanation'
          },
          {
            text: 'Question 5',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: 'Explanation'
          }
        ]
      });

      const provider = getAIProvider();
      jest.spyOn(provider, 'generateJson').mockResolvedValue(mockQuizJson);

      const res = await request(app)
        .post('/api/v1/quizzes/generate')
        .set('Cookie', [cookieA])
        .send({ documentId: docAId, difficulty: 'MEDIUM' });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Networking CSMA/CD Practice Quiz');
      expect(res.body.data.questions.length).toBe(5);
      expect(res.body.data.questions[0].options.length).toBe(4);

      quizAId = res.body.data.id;
      jest.restoreAllMocks();
    });

    it('should reject quiz generation for non-existent or unauthorized document', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes/generate')
        .set('Cookie', [cookieA])
        .send({ documentId: docBId }); // User A trying to generate quiz from User B document

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should fail gracefully if AI returns invalid JSON structure', async () => {
      const provider = getAIProvider();
      jest.spyOn(provider, 'generateJson').mockResolvedValue('Invalid non-json response string');

      const res = await request(app)
        .post('/api/v1/quizzes/generate')
        .set('Cookie', [cookieA])
        .send({ documentId: docAId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Failed to generate valid educational questions');
      jest.restoreAllMocks();
    });
  });

  describe('Quiz Attempt & Scoring', () => {
    it('should calculate 100% score for correct answer and persist attempt', async () => {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizAId },
        include: { questions: true }
      });
      const answers = quiz!.questions.map((q) => ({
        questionId: q.id,
        selectedOption: q.correctAnswer
      }));

      const res = await request(app)
        .post(`/api/v1/quizzes/${quizAId}/attempt`)
        .set('Cookie', [cookieA])
        .send({ answers });

      expect(res.status).toBe(201);
      expect(res.body.data.score).toBe(100);
      expect(res.body.data.answers.length).toBe(5);
    });

    it('should calculate 0% score for incorrect answer', async () => {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizAId },
        include: { questions: true }
      });
      const q = quiz!.questions[0];

      const res = await request(app)
        .post(`/api/v1/quizzes/${quizAId}/attempt`)
        .set('Cookie', [cookieA])
        .send({
          answers: [
            {
              questionId: q.id,
              selectedOption: 'Wrong Option'
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.data.score).toBe(0);
      expect(res.body.data.answers[0].isCorrect).toBe(false);
    });

    it('User B must NOT be allowed to access or attempt User A quiz', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/${quizAId}`)
        .set('Cookie', [cookieB]);

      expect(res.status).toBe(404);

      const attemptRes = await request(app)
        .post(`/api/v1/quizzes/${quizAId}/attempt`)
        .set('Cookie', [cookieB])
        .send({ answers: [] });

      expect(attemptRes.status).toBe(404);
    });
  });
});
