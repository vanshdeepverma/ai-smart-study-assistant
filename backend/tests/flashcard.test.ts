import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import { getAIProvider } from '../src/services/chat.service';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('P3 Flashcard System API & Security Tests', () => {
  const userAEmail = `flashcard_usera_${uuidv4()}@flashcardtest.com`;
  const userBEmail = `flashcard_userb_${uuidv4()}@flashcardtest.com`;
  
  let userAId: string;
  let userBId: string;
  let cookieA: string;
  let cookieB: string;
  let docAId: string;
  let docBId: string;
  let flashcardAId: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Password123!', salt);

    // Create User A & User B
    const userA = await prisma.user.create({
      data: { name: 'Flashcard User A', email: userAEmail, passwordHash: passHash }
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: { name: 'Flashcard User B', email: userBEmail, passwordHash: passHash }
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
    await prisma.flashcardProgress.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.flashcard.deleteMany({ where: { documentId: { in: [docAId, docBId] } } });
    await prisma.document.deleteMany({ where: { id: { in: [docAId, docBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  });

  describe('Flashcard Generation', () => {
    it('should generate valid flashcards using Gemini JSON output', async () => {
      const mockJson = JSON.stringify({
        flashcards: [
          { front: 'Q1', back: 'A1' },
          { front: 'Q2', back: 'A2' },
          { front: 'Q3', back: 'A3' },
          { front: 'Q4', back: 'A4' },
          { front: 'Q5', back: 'A5' }
        ]
      });

      const provider = getAIProvider();
      jest.spyOn(provider, 'generateJson').mockResolvedValue(mockJson);

      const res = await request(app)
        .post('/api/v1/flashcards/generate')
        .set('Cookie', [cookieA])
        .send({ documentId: docAId, difficulty: 'MEDIUM' });

      expect(res.status).toBe(201);
      expect(res.body.data.length).toBe(5);
      expect(res.body.data[0].front).toBe('Q1');

      flashcardAId = res.body.data[0].id;
      jest.restoreAllMocks();
    });

    it('should reject flashcard generation for non-existent or unauthorized document', async () => {
      const res = await request(app)
        .post('/api/v1/flashcards/generate')
        .set('Cookie', [cookieA])
        .send({ documentId: docBId }); // User A trying to generate flashcards from User B document

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should fail gracefully if AI returns invalid JSON structure', async () => {
      const provider = getAIProvider();
      jest.spyOn(provider, 'generateJson').mockResolvedValue('Invalid non-json response string');

      const res = await request(app)
        .post('/api/v1/flashcards/generate')
        .set('Cookie', [cookieA])
        .send({ documentId: docAId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Failed to generate valid educational flashcards');
      jest.restoreAllMocks();
    });
  });

  describe('Flashcard Retrieval and Deletion', () => {
    it('should retrieve own flashcards', async () => {
      const res = await request(app)
        .get('/api/v1/flashcards')
        .set('Cookie', [cookieA]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].documentId).toBe(docAId);
    });

    it('should not expose another user\'s flashcards', async () => {
      const res = await request(app)
        .get('/api/v1/flashcards')
        .set('Cookie', [cookieB]);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0); // User B has generated no flashcards
    });

    describe('DELETE /api/v1/flashcards/:id', () => {
      it('should prevent deleting a flashcard that does not exist', async () => {
        const res = await request(app)
          .delete('/api/v1/flashcards/00000000-0000-0000-0000-000000000000')
          .set('Cookie', [cookieA]);
        
        expect(res.status).toBe(404);
      });

      it('should delete a flashcard', async () => {
        const res = await request(app)
          .delete(`/api/v1/flashcards/${flashcardAId}`)
          .set('Cookie', [cookieA]);
        
        expect(res.status).toBe(200);
      });
    });

    describe('PATCH /api/v1/flashcards/:id/rating', () => {
      let testCardId: string;

      beforeAll(async () => {
        // Create a test flashcard for rating
        const mockJson = JSON.stringify({ flashcards: [{ front: 'R1', back: 'A1' }] });
        jest.spyOn(getAIProvider(), 'generateJson').mockResolvedValue(mockJson);
        
        const res = await request(app)
          .post('/api/v1/flashcards/generate')
          .set('Cookie', [cookieA])
          .send({ documentId: docAId, difficulty: 'MEDIUM' });
        
        testCardId = res.body.data[0].id;
      });

      it('should save a HARD rating', async () => {
        const res = await request(app)
          .patch(`/api/v1/flashcards/${testCardId}/rating`)
          .set('Cookie', [cookieA])
          .send({ rating: 'HARD' });
        
        expect(res.status).toBe(200);
        expect(res.body.data.rating).toBe('HARD');
      });

      it('should save a GOOD rating', async () => {
        const res = await request(app)
          .patch(`/api/v1/flashcards/${testCardId}/rating`)
          .set('Cookie', [cookieA])
          .send({ rating: 'GOOD' });
        
        expect(res.status).toBe(200);
        expect(res.body.data.rating).toBe('GOOD');
      });

      it('should save an EASY rating', async () => {
        const res = await request(app)
          .patch(`/api/v1/flashcards/${testCardId}/rating`)
          .set('Cookie', [cookieA])
          .send({ rating: 'EASY' });
        
        expect(res.status).toBe(200);
        expect(res.body.data.rating).toBe('EASY');
      });

      it('should reject an invalid rating', async () => {
        const res = await request(app)
          .patch(`/api/v1/flashcards/${testCardId}/rating`)
          .set('Cookie', [cookieA])
          .send({ rating: 'INVALID_RATING' });
        
        expect(res.status).toBe(400);
      });

      it('should reject an unauthenticated request', async () => {
        const res = await request(app)
          .patch(`/api/v1/flashcards/${testCardId}/rating`)
          .send({ rating: 'EASY' });
        
        expect(res.status).toBe(401);
      });

      it('should prevent User B from rating User A\'s flashcard', async () => {
        const res = await request(app)
          .patch(`/api/v1/flashcards/${testCardId}/rating`)
          .set('Cookie', [cookieB])
          .send({ rating: 'EASY' });
        
        expect(res.status).toBe(404);
      });

      it('should reject rating a non-existent flashcard', async () => {
        const res = await request(app)
          .patch('/api/v1/flashcards/00000000-0000-0000-0000-000000000000/rating')
          .set('Cookie', [cookieA])
          .send({ rating: 'EASY' });
        
        expect(res.status).toBe(404);
      });
    });

    it('should not allow deleting another user\'s flashcard', async () => {
      // First let User A generate another flashcard
      const mockJson = JSON.stringify({ flashcards: [{ front: 'Q', back: 'A' }] });
      jest.spyOn(getAIProvider(), 'generateJson').mockResolvedValue(mockJson);

      const genRes = await request(app)
        .post('/api/v1/flashcards/generate')
        .set('Cookie', [cookieA])
        .send({ documentId: docAId, difficulty: 'MEDIUM' });
        
      const newCardId = genRes.body.data[0].id;
      jest.restoreAllMocks();

      // User B attempts to delete User A's flashcard
      const delRes = await request(app)
        .delete(`/api/v1/flashcards/${newCardId}`)
        .set('Cookie', [cookieB]);

      expect(delRes.status).toBe(404);
    });
  });
});
