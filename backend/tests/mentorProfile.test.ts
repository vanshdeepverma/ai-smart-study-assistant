import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('P3-A Student Learning Profile API & Security Tests', () => {
  const userAEmail = `profile_usera_${uuidv4()}@profiletest.com`;
  const userBEmail = `profile_userb_${uuidv4()}@profiletest.com`;

  let userAId: string;
  let userBId: string;
  let cookieA: string;
  let cookieB: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Password123!', salt);

    // Register User A & User B
    const userA = await prisma.user.create({
      data: { name: 'Profile User A', email: userAEmail, passwordHash: passHash }
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: { name: 'Profile User B', email: userBEmail, passwordHash: passHash }
    });
    userBId = userB.id;

    // Login User A
    const loginA = await request(app).post('/api/v1/auth/login').send({ email: userAEmail, password: 'Password123!' });
    cookieA = Array.isArray(loginA.headers['set-cookie']) ? loginA.headers['set-cookie'][0] : loginA.headers['set-cookie'];

    // Login User B
    const loginB = await request(app).post('/api/v1/auth/login').send({ email: userBEmail, password: 'Password123!' });
    cookieB = Array.isArray(loginB.headers['set-cookie']) ? loginB.headers['set-cookie'][0] : loginB.headers['set-cookie'];
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } }
    });
  });

  it('1. Should return 401 Unauthorized for unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/mentor/profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Should create and return initial empty profile for new student', async () => {
    const res = await request(app)
      .get('/api/v1/mentor/profile')
      .set('Cookie', [cookieA]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(userAEmail);
    expect(res.body.data.profile.preferredStyle).toBe('ANALOGY');
    expect(res.body.data.stats.totalDocuments).toBe(0);
    expect(res.body.data.stats.totalChatSessions).toBe(0);
    expect(res.body.data.stats.totalQuizzesAttempted).toBe(0);
    expect(res.body.data.stats.averageQuizScore).toBeNull();
  });

  it('3. Should calculate exact real application statistics for active student', async () => {
    // Create Document for User A
    const docA = await prisma.document.create({
      data: {
        userId: userAId,
        filename: 'CSMA_CD_Notes.pdf',
        fileUrl: '/uploads/documents/csma.pdf',
        status: 'READY'
      }
    });

    // Create Chat Session + Messages for User A
    const sessionA = await prisma.chatSession.create({
      data: {
        userId: userAId,
        title: 'CSMA/CD Discussion'
      }
    });

    await prisma.chatMessage.createMany({
      data: [
        { sessionId: sessionA.id, role: 'USER', content: 'Explain CSMA/CD' },
        { sessionId: sessionA.id, role: 'ASSISTANT', content: 'CSMA/CD stands for Carrier Sense Multiple Access...' }
      ]
    });

    // Create Quiz + Attempt for User A
    const quizA = await prisma.quiz.create({
      data: {
        documentId: docA.id,
        title: 'Ethernet CSMA/CD Quiz',
        difficulty: 'MEDIUM'
      }
    });

    await prisma.quizAttempt.create({
      data: {
        userId: userAId,
        quizId: quizA.id,
        score: 80,
        completedAt: new Date()
      }
    });

    const res = await request(app)
      .get('/api/v1/mentor/profile')
      .set('Cookie', [cookieA]);

    expect(res.status).toBe(200);
    expect(res.body.data.stats.totalDocuments).toBe(1);
    expect(res.body.data.stats.readyDocuments).toBe(1);
    expect(res.body.data.stats.totalChatSessions).toBe(1);
    expect(res.body.data.stats.totalChatMessages).toBe(2);
    expect(res.body.data.stats.totalQuizzesAttempted).toBe(1);
    expect(res.body.data.stats.averageQuizScore).toBe(80);
    expect(res.body.data.activity.recentDocuments.length).toBe(1);
    expect(res.body.data.activity.recentConversations.length).toBe(1);
    expect(res.body.data.mastery.strongTopics.length).toBe(1);
    expect(res.body.data.mastery.strongTopics[0].title).toBe('Ethernet CSMA/CD Quiz');
  });

  it('4. Multi-Tenant Security Isolation: User B cannot see User A profile data', async () => {
    const resB = await request(app)
      .get('/api/v1/mentor/profile')
      .set('Cookie', [cookieB]);

    expect(resB.status).toBe(200);
    expect(resB.body.data.user.email).toBe(userBEmail);
    expect(resB.body.data.stats.totalDocuments).toBe(0);
    expect(resB.body.data.stats.totalChatSessions).toBe(0);
    expect(resB.body.data.stats.totalQuizzesAttempted).toBe(0);
  });

  it('5. Should update profile preferences via PATCH /api/v1/mentor/profile', async () => {
    const patchRes = await request(app)
      .patch('/api/v1/mentor/profile')
      .set('Cookie', [cookieA])
      .send({
        preferredStyle: 'STEP_BY_STEP',
        academicGoal: 'Prepare for Computer Networks Final Exam'
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);

    const getRes = await request(app)
      .get('/api/v1/mentor/profile')
      .set('Cookie', [cookieA]);

    expect(getRes.body.data.profile.preferredStyle).toBe('STEP_BY_STEP');
    expect(getRes.body.data.profile.academicGoal).toBe('Prepare for Computer Networks Final Exam');
  });
});
