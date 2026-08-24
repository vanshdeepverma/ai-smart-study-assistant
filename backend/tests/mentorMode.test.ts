import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import { v4 as uuidv4 } from 'uuid';
import { getSystemPrompt, buildRAGPrompt } from '../src/services/prompts';

describe('P3-D Adaptive AI Mentor Modes Unit & Security Tests', () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;
  let sessionAId: string;

  beforeAll(async () => {
    // 1. Create User A
    const emailA = `mode_usera_${uuidv4()}@test.com`;
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: emailA, password: 'Password123!', name: 'User A' });
    const cookiesA = resA.headers['set-cookie'] || [];
    userAToken = cookiesA[0] ? cookiesA[0].split(';')[0].split('=')[1] : '';
    userAId = resA.body.data.id;

    // 2. Create User B
    const emailB = `mode_userb_${uuidv4()}@test.com`;
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: emailB, password: 'Password123!', name: 'User B' });
    const cookiesB = resB.headers['set-cookie'] || [];
    userBToken = cookiesB[0] ? cookiesB[0].split(';')[0].split('=')[1] : '';
    userBId = resB.body.data.id;

    // 3. Create Session for User A
    const sessionA = await prisma.chatSession.create({
      data: {
        userId: userAId,
        title: 'User A Mode Session'
      }
    });
    sessionAId = sessionA.id;
  });

  afterAll(async () => {
    if (sessionAId) {
      await prisma.chatMessage.deleteMany({ where: { sessionId: sessionAId } });
      await prisma.chatSession.deleteMany({ where: { id: sessionAId } });
    }
    if (userAId || userBId) {
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId].filter(Boolean) } } });
    }
    await prisma.$disconnect();
  });

  describe('1. Authentication & Security Isolation', () => {
    it('should reject unauthenticated GET mode requests with 401', async () => {
      const res = await request(app).get(`/api/v1/chat/sessions/${sessionAId}/mode`);
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated PATCH mode requests with 401', async () => {
      const res = await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/mode`)
        .send({ mode: 'SOCRATIC' });
      expect(res.status).toBe(401);
    });

    it('should reject updating mode for another user session with 404', async () => {
      const res = await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/mode`)
        .set('Cookie', [`token=${userBToken}`])
        .send({ mode: 'EXAM' });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Chat session not found');
    });

    it('should reject invalid mentor mode string with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/mode`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ mode: 'INVALID_MODE' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid mentor mode');
    });
  });

  describe('2. Mentor Mode Endpoint Verification & Default Behavior', () => {
    it('should default existing and new sessions to EXPLAIN mode', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/sessions/${sessionAId}/mode`)
        .set('Cookie', [`token=${userAToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.mentorMode).toBe('EXPLAIN');
      expect(res.body.data.availableModes).toContain('SOCRATIC');
    });

    it('should allow valid mode update to SOCRATIC and persist to database', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/mode`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ mode: 'SOCRATIC' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.mentorMode).toBe('SOCRATIC');

      // Verify DB persistence
      const session = await prisma.chatSession.findUnique({ where: { id: sessionAId } });
      expect(session?.mentorMode).toBe('SOCRATIC');
    });
  });

  describe('3. Pedagogical Engine Prompt Generation', () => {
    it('should generate EXPLAIN prompt instructions', () => {
      const prompt = getSystemPrompt('EXPLAIN');
      expect(prompt).toContain('PEDAGOGICAL MODE: EXPLAIN');
      expect(prompt).toContain('Check your understanding');
    });

    it('should generate SOCRATIC prompt instructions with DO NOT reveal complete answer rule', () => {
      const prompt = getSystemPrompt('SOCRATIC');
      expect(prompt).toContain('PEDAGOGICAL MODE: SOCRATIC');
      expect(prompt).toContain('DO NOT immediately provide the complete answer');
    });

    it('should generate EXAM prompt instructions with Exam Tip / Common Trap rule', () => {
      const prompt = getSystemPrompt('EXAM');
      expect(prompt).toContain('PEDAGOGICAL MODE: EXAM PREP');
      expect(prompt).toContain('EXAM TIP / COMMON TRAP');
    });

    it('should generate VIVA prompt instructions enforcing ONE question at a time', () => {
      const prompt = getSystemPrompt('VIVA');
      expect(prompt).toContain('PEDAGOGICAL MODE: VIVA VOCE');
      expect(prompt).toContain('Ask ONLY ONE question at a time');
    });

    it('should generate DOUBT prompt instructions with misconception diagnosis', () => {
      const prompt = getSystemPrompt('DOUBT');
      expect(prompt).toContain('PEDAGOGICAL MODE: DOUBT SOLVER');
      expect(prompt.toLowerCase()).toContain('misconception');
    });

    it('should generate STUDY prompt instructions with 4-phase guided session', () => {
      const prompt = getSystemPrompt('STUDY');
      expect(prompt).toContain('PEDAGOGICAL MODE: STUDY SESSION');
      expect(prompt).toContain('Phase 1');
      expect(prompt).toContain('Phase 4');
    });

    it('should preserve P3-B Learning Memories inside prompt', () => {
      const mockMemories: any[] = [
        {
          id: 'mem1',
          category: 'CONCEPT_CONFUSION',
          topic: 'TCP',
          content: 'Confuses flow control with congestion control',
          confidence: 0.85
        }
      ];
      const prompt = getSystemPrompt('DOUBT', mockMemories);
      expect(prompt).toContain('STUDENT LEARNING MEMORIES (MENTOR CONTEXT)');
      expect(prompt).toContain('Confuses flow control with congestion control');
    });

    it('should preserve P3-C Document Focus inside buildRAGPrompt', () => {
      const prompt = buildRAGPrompt([], 'EXAM', [], 'Computer Networks.pdf');
      expect(prompt).toContain('ACTIVE STUDY SOURCE FOCUS');
      expect(prompt).toContain('Computer Networks.pdf');
    });
  });
});
