import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import { LearningMemoryService } from '../src/services/learningMemory.service';
import { buildRAGPrompt } from '../src/services/prompts';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('P3-B Learning Memory Subsystem & Security Tests', () => {
  const userAEmail = `mem_usera_${uuidv4()}@memtest.com`;
  const userBEmail = `mem_userb_${uuidv4()}@memtest.com`;

  let userAId: string;
  let userBId: string;
  let cookieA: string;
  let cookieB: string;
  let memoryAId: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Password123!', salt);

    const userA = await prisma.user.create({
      data: { name: 'Memory Student A', email: userAEmail, passwordHash: passHash }
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: { name: 'Memory Student B', email: userBEmail, passwordHash: passHash }
    });
    userBId = userB.id;

    const loginA = await request(app).post('/api/v1/auth/login').send({ email: userAEmail, password: 'Password123!' });
    cookieA = Array.isArray(loginA.headers['set-cookie']) ? loginA.headers['set-cookie'][0] : loginA.headers['set-cookie'];

    const loginB = await request(app).post('/api/v1/auth/login').send({ email: userBEmail, password: 'Password123!' });
    cookieB = Array.isArray(loginB.headers['set-cookie']) ? loginB.headers['set-cookie'][0] : loginB.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } }
    });
  });

  it('1. Unauthenticated requests should be rejected with 401', async () => {
    const res = await request(app).get('/api/v1/mentor/memories');
    expect(res.status).toBe(401);
  });

  it('2. Confidence Threshold: Should NOT persist memory if confidence < 0.70', async () => {
    const mem = await LearningMemoryService.createOrUpdateMemory(userAId, {
      topic: 'Subnetting',
      category: 'CONCEPT_CONFUSION',
      content: 'Low confidence guess about subnet masks',
      confidence: 0.55
    });

    expect(mem).toBeNull();

    const dbMemories = await prisma.learningMemory.findMany({ where: { userId: userAId } });
    expect(dbMemories.length).toBe(0);
  });

  it('3. Memory Creation: Should persist memory when confidence >= 0.70', async () => {
    const res = await request(app)
      .post('/api/v1/mentor/memories')
      .set('Cookie', [cookieA])
      .send({
        topic: 'Computer Networks',
        category: 'CONCEPT_CONFUSION',
        content: 'Student repeatedly confuses TCP flow control with congestion control.',
        confidence: 0.85,
        evidence: 'I always get confused between flow control and congestion control'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topic).toBe('Computer Networks');
    expect(res.body.data.category).toBe('CONCEPT_CONFUSION');
    memoryAId = res.body.data.id;
  });

  it('4. Deduplication & Memory Update: Repeated evidence updates existing memory instead of creating duplicate', async () => {
    const res = await request(app)
      .post('/api/v1/mentor/memories')
      .set('Cookie', [cookieA])
      .send({
        topic: 'Computer Networks',
        category: 'CONCEPT_CONFUSION',
        content: 'Student repeatedly confuses TCP flow control with congestion control.',
        confidence: 0.95,
        evidence: 'Updated evidence string'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(memoryAId); // Same ID
    expect(res.body.data.confidence).toBe(0.95);

    const allUserAMemories = await prisma.learningMemory.findMany({ where: { userId: userAId } });
    expect(allUserAMemories.length).toBe(1); // No duplicates
  });

  it('5. Multi-Tenant Security: User B cannot retrieve or access User A memory', async () => {
    const resBGet = await request(app)
      .get(`/api/v1/mentor/memories/${memoryAId}`)
      .set('Cookie', [cookieB]);

    expect(resBGet.status).toBe(404);

    const resBList = await request(app)
      .get('/api/v1/mentor/memories')
      .set('Cookie', [cookieB]);

    expect(resBList.status).toBe(200);
    expect(resBList.body.data.length).toBe(0);
  });

  it('6. Multi-Tenant Security: User B cannot delete User A memory', async () => {
    const resDeleteB = await request(app)
      .delete(`/api/v1/mentor/memories/${memoryAId}`)
      .set('Cookie', [cookieB]);

    expect(resDeleteB.status).toBe(404);

    // Memory A should still exist in DB
    const existing = await prisma.learningMemory.findUnique({ where: { id: memoryAId } });
    expect(existing).not.toBeNull();
  });

  it('7. Memory Resolution: Toggling isResolved updates status', async () => {
    const resPatch = await request(app)
      .patch(`/api/v1/mentor/memories/${memoryAId}`)
      .set('Cookie', [cookieA])
      .send({ isResolved: true });

    expect(resPatch.status).toBe(200);
    expect(resPatch.body.data.isResolved).toBe(true);

    // Reset back to active
    await LearningMemoryService.setMemoryResolution(userAId, memoryAId, false);
  });

  it('8. Relevant Memory Selection & Prompt Context Integration', async () => {
    const activeMemories = await LearningMemoryService.findRelevantMemoriesForQuery(userAId, 'Tell me about TCP flow control');
    expect(activeMemories.length).toBe(1);
    expect(activeMemories[0].topic).toBe('Computer Networks');

    const promptText = buildRAGPrompt([], 'EXPLAIN', activeMemories);
    expect(promptText).toContain('STUDENT LEARNING MEMORIES (MENTOR CONTEXT)');
    expect(promptText).toContain('Student repeatedly confuses TCP flow control with congestion control.');
    expect(promptText).toContain('PEDAGOGICAL DIRECTIVE FOR MENTOR');
  });

  it('9. Memory Deletion: Student can delete memory via DELETE endpoint', async () => {
    const resDel = await request(app)
      .delete(`/api/v1/mentor/memories/${memoryAId}`)
      .set('Cookie', [cookieA]);

    expect(resDel.status).toBe(200);

    const checkDel = await prisma.learningMemory.findUnique({ where: { id: memoryAId } });
    expect(checkDel).toBeNull();
  });
});
