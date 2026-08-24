import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import { v4 as uuidv4 } from 'uuid';
import { RAGService } from '../src/services/rag.service';
import { AIProvider, ChatMessageInput } from '../src/services/ai/AIProvider.interface';
import { setAIProvider } from '../src/services/chat.service';

class MockAIProvider implements AIProvider {
  initialize(): void {}

  async *streamChat(
    _history: ChatMessageInput[],
    _systemInstruction?: string,
    _options?: { temperature?: number; maxTokens?: number }
  ): AsyncGenerator<string, void, unknown> {
    yield "Hello";
    yield " world";
    yield " from";
    yield " mock";
    yield " AI.";
  }

  async generateJson(_prompt: string): Promise<string> {
    return '{}';
  }
}
jest.setTimeout(30000);

describe('P3-C Document Focus API & RAG Security Tests', () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;

  let docA1Id: string;
  let docA2Id: string;
  let docBId: string;
  let sessionAId: string;
  let sessionBId: string;

  beforeAll(async () => {
    setAIProvider(new MockAIProvider());
    // 1. Create User A
    const emailA = `docfocus_usera_${uuidv4()}@test.com`;
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: emailA, password: 'Password123!', name: 'User A' });
    
    const cookiesA = resA.headers['set-cookie'] || [];
    userAToken = cookiesA[0] ? cookiesA[0].split(';')[0].split('=')[1] : '';
    userAId = resA.body.data.id;

    // 2. Create User B
    const emailB = `docfocus_userb_${uuidv4()}@test.com`;
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: emailB, password: 'Password123!', name: 'User B' });

    const cookiesB = resB.headers['set-cookie'] || [];
    userBToken = cookiesB[0] ? cookiesB[0].split(';')[0].split('=')[1] : '';
    userBId = resB.body.data.id;

    // 3. Create Documents for User A
    const docA1 = await prisma.document.create({
      data: {
        userId: userAId,
        filename: 'Networks_A1.pdf',
        fileUrl: '/uploads/a1.pdf',
        status: 'READY'
      }
    });
    docA1Id = docA1.id;

    const docA2 = await prisma.document.create({
      data: {
        userId: userAId,
        filename: 'DBMS_A2.pdf',
        fileUrl: '/uploads/a2.pdf',
        status: 'READY'
      }
    });
    docA2Id = docA2.id;

    // 4. Create Document for User B
    const docB = await prisma.document.create({
      data: {
        userId: userBId,
        filename: 'Secret_B.pdf',
        fileUrl: '/uploads/b.pdf',
        status: 'READY'
      }
    });
    docBId = docB.id;

    // 5. Create Chunks for Document A1 and Document A2
    await prisma.documentChunk.create({
      data: {
        documentId: docA1Id,
        content: 'TCP flow control uses sliding window algorithm.',
        pageNumber: 1
      }
    });

    await prisma.documentChunk.create({
      data: {
        documentId: docA2Id,
        content: 'Relational databases use B-tree indexes for fast queries.',
        pageNumber: 1
      }
    });

    // 6. Create Chat Sessions
    const sessionA = await prisma.chatSession.create({
      data: {
        userId: userAId,
        title: 'User A Networks Chat'
      }
    });
    sessionAId = sessionA.id;

    const sessionB = await prisma.chatSession.create({
      data: {
        userId: userBId,
        title: 'User B Secret Chat'
      }
    });
    sessionBId = sessionB.id;
  });

  afterAll(async () => {
    // Cleanup isolated test data
    if (sessionAId || sessionBId) {
      await prisma.chatMessage.deleteMany({ where: { sessionId: { in: [sessionAId, sessionBId].filter(Boolean) } } });
      await prisma.chatSession.deleteMany({ where: { id: { in: [sessionAId, sessionBId].filter(Boolean) } } });
    }
    if (docA1Id || docA2Id || docBId) {
      await prisma.documentChunk.deleteMany({ where: { documentId: { in: [docA1Id, docA2Id, docBId].filter(Boolean) } } });
      await prisma.document.deleteMany({ where: { id: { in: [docA1Id, docA2Id, docBId].filter(Boolean) } } });
    }
    if (userAId || userBId) {
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId].filter(Boolean) } } });
    }
    await prisma.$disconnect();
  });

  describe('1. Authentication & Session Security', () => {
    it('should reject unauthenticated focus requests with 401', async () => {
      const res = await request(app).get(`/api/v1/chat/sessions/${sessionAId}/focus`);
      expect(res.status).toBe(401);
    });

    it('should reject updating focus for another user session with 404', async () => {
      const res = await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/focus`)
        .set('Cookie', [`token=${userBToken}`])
        .send({ documentId: docBId });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Chat session not found');
    });
  });

  describe('2. Document Focus Ownership Security', () => {
    it('should allow User A to set focus to their own READY document A1', async () => {
      const res = await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/focus`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ documentId: docA1Id });

      expect(res.status).toBe(200);
      expect(res.body.data.focusedDocumentId).toBe(docA1Id);
      expect(res.body.data.focusedDocument.filename).toBe('Networks_A1.pdf');
    });

    it('should REJECT User A attempting to focus on User B document with 404', async () => {
      const res = await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/focus`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ documentId: docBId });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Document not found or does not belong to user');

      // Verify focus did NOT change
      const getRes = await request(app)
        .get(`/api/v1/chat/sessions/${sessionAId}/focus`)
        .set('Cookie', [`token=${userAToken}`]);
      expect(getRes.body.data.focusedDocumentId).toBe(docA1Id);
    });

    it('should allow setting documentId to null (reverting to ALL_DOCUMENTS)', async () => {
      const res = await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/focus`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ documentId: null });

      expect(res.status).toBe(200);
      expect(res.body.data.focusedDocumentId).toBeNull();
      expect(res.body.data.focusedDocument).toBeNull();
    });
  });

  describe('3. RAG Retrieval Filtering & Security Isolation', () => {
    it('should restrict findSimilarChunks to focused document when documentId is provided', async () => {
      // Mock embedding to return dummy vector
      jest.spyOn(RAGService, 'getEmbedding').mockResolvedValueOnce(new Array(768).fill(0.1));

      const chunks = await RAGService.findSimilarChunks(userAId, 'algorithm queries', 5, docA1Id);
      
      // All returned chunks MUST belong to docA1Id
      for (const chunk of chunks) {
        expect(chunk.documentId).toBe(docA1Id);
        expect(chunk.documentId).not.toBe(docA2Id);
        expect(chunk.documentId).not.toBe(docBId);
      }
    });

    it('should NEVER return chunks from another user even if their documentId is passed', async () => {
      jest.spyOn(RAGService, 'getEmbedding').mockResolvedValueOnce(new Array(768).fill(0.1));

      // User A attempts to search with User B's docBId
      const chunks = await RAGService.findSimilarChunks(userAId, 'secret information', 5, docBId);
      
      // Must return empty array because docB does not belong to User A
      expect(chunks).toEqual([]);
    });
  });

  describe('4. Deletion Fallback', () => {
    it('should reset session focus to null when the focused document is deleted', async () => {
      // Set focus to A2
      await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/focus`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ documentId: docA2Id });

      // Delete Document A2
      await prisma.document.delete({ where: { id: docA2Id } });

      // Retrieve focus -> should automatically be null via onDelete: SetNull
      const getRes = await request(app)
        .get(`/api/v1/chat/sessions/${sessionAId}/focus`)
        .set('Cookie', [`token=${userAToken}`]);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.focusedDocumentId).toBeNull();
    });
  });

  describe('5. Strict RAG Boundary API Tests', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('A. Focused document + in-document question -> answer allowed (chunks found)', async () => {
      // 1. Set Focus to A1
      await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/focus`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ documentId: docA1Id });

      // Mock chunks found
      jest.spyOn(require('../src/services/rag.service').RAGService, 'findSimilarChunks').mockResolvedValue([{
        id: 'chunk1',
        documentId: docA1Id,
        content: 'TCP sliding window...',
        pageNumber: 1,
        filename: 'Networks_A1.pdf',
        similarity: 0.85
      }]);

      const res = await request(app)
        .post(`/api/v1/chat/sessions/${sessionAId}/messages/stream`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ content: 'What is sliding window?' });

      expect(res.status).toBe(200);
      // Wait a tiny bit for async SSE end
      await new Promise(r => setTimeout(r, 100));
      
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: sessionAId },
        orderBy: { createdAt: 'desc' }
      });
      // Top message is ASSISTANT
      expect(messages[0].role).toBe('ASSISTANT');
      // Should not be the fallback message, because chunks were found!
      expect(messages[0].content).not.toContain("This topic isn't covered in");
    });

    it('B. Focused document + unrelated question -> strict fallback returned', async () => {
      // Mock NO chunks found (similarity < 0.76 or just unrelated)
      jest.spyOn(RAGService, 'findSimilarChunks').mockResolvedValue([]);

      const res = await request(app)
        .post(`/api/v1/chat/sessions/${sessionAId}/messages/stream`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ content: 'Who is the prime minister?' });

      expect(res.status).toBe(200);
      expect(res.text).toContain("This topic isn't covered in Networks_A1.pdf");
      
      await new Promise(r => setTimeout(r, 1000));

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: sessionAId },
        orderBy: { createdAt: 'desc' }
      });
      expect(messages[0].role).toBe('ASSISTANT');
      expect(messages[0].content).toContain("This topic isn't covered in Networks_A1.pdf");
    });

    it('C. ALL_DOCUMENTS mode + unrelated question -> searches all and falls back', async () => {
      // Remove focus
      await request(app)
        .patch(`/api/v1/chat/sessions/${sessionAId}/focus`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ documentId: null });

      // Mock NO chunks found globally
      jest.spyOn(RAGService, 'findSimilarChunks').mockResolvedValue([]);

      const res = await request(app)
        .post(`/api/v1/chat/sessions/${sessionAId}/messages/stream`)
        .set('Cookie', [`token=${userAToken}`])
        .send({ content: 'What is the capital of France?' });

      expect(res.status).toBe(200);
      expect(res.text).toContain("I couldn't find this topic in your uploaded study materials");

      await new Promise(r => setTimeout(r, 1000));
      
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: sessionAId },
        orderBy: { createdAt: 'desc' }
      });
      expect(messages[0].role).toBe('ASSISTANT');
      expect(messages[0].content).toContain("I couldn't find this topic in your uploaded study materials");
    });
  });
});
