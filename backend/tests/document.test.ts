import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Mock pdf processing and RAG service for fast deterministic test execution
jest.mock('../src/services/pdfProcessing.service', () => {
  return {
    PdfProcessingService: {
      extractText: jest.fn().mockResolvedValue({ text: 'Mocked PDF text content', pages: 1 }),
      chunkText: jest.fn().mockReturnValue(['Mocked PDF text content']),
    }
  };
});

jest.mock('../src/services/rag.service', () => {
  return {
    RAGService: {
      getEmbeddings: jest.fn().mockResolvedValue([Array(768).fill(0.1)]),
      getEmbedding: jest.fn().mockResolvedValue(Array(768).fill(0.1)),
      findSimilarChunks: jest.fn().mockResolvedValue([]),
    }
  };
});

describe('Document API', () => {
  const uniqueEmail = `doc_test_${uuidv4()}@smartstudy.com`;
  const hackerEmail1 = `hacker_${uuidv4()}@example.com`;
  const hackerEmail2 = `hacker2_${uuidv4()}@example.com`;
  
  const testUser = {
    email: uniqueEmail,
    password: 'SecurePassword123!',
  };
  let authToken: string;
  let testDocumentId: string;
  let uploadsDir = path.join(process.cwd(), 'uploads', 'documents');

  beforeAll(async () => {
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create user and get token
    const salt = await bcrypt.genSalt(10);
    await prisma.user.create({
      data: {
        name: 'Doc Test User',
        email: testUser.email,
        passwordHash: await bcrypt.hash(testUser.password, salt),
      },
    });

    const res = await request(app).post('/api/v1/auth/login').send(testUser);
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      authToken = cookieArray.find((c: string) => c.startsWith('token=')) || '';
    }
  });

  afterAll(async () => {
    await prisma.document.deleteMany({ where: { user: { email: { in: [testUser.email, hackerEmail1, hackerEmail2] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [testUser.email, hackerEmail1, hackerEmail2] } } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/documents', () => {
    it('should block unauthenticated uploads', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .attach('file', Buffer.from('test'), 'test.pdf');
      
      expect(res.status).toBe(401);
    });

    it('should reject non-PDF files', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Cookie', [authToken])
        .attach('file', Buffer.from('console.log("hello")'), 'test.js');
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.message).toContain('Only PDF files are allowed');
    });

    it('should upload a PDF successfully and start processing', async () => {
      // Create a dummy pdf buffer
      const dummyPdf = Buffer.from('%PDF-1.4\n%MockPDF');
      
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Cookie', [authToken])
        .attach('file', dummyPdf, 'test_document.pdf');
      
      expect(res.status).toBe(202);
      expect(res.body.data.filename).toBe('test_document.pdf');
      expect(res.body.data.status).toBe('PROCESSING');
      
      testDocumentId = res.body.data.id;

      // Wait a bit for background processing to finish
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });

  describe('GET /api/v1/documents', () => {
    it('should list user documents', async () => {
      const res = await request(app)
        .get('/api/v1/documents')
        .set('Cookie', [authToken]);
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(testDocumentId);
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    it('should get document details showing READY status and chunks', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${testDocumentId}`)
        .set('Cookie', [authToken]);
      
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('READY'); // Because of the mocked background processing
      expect(res.body.data._count.chunks).toBeGreaterThan(0); // Chunk was created
    });

    it('should prevent access to another user\'s document', async () => {
      // Create a secondary user
      const salt = await bcrypt.genSalt(10);
      await prisma.user.create({
        data: {
          name: 'Hacker',
          email: hackerEmail1,
          passwordHash: await bcrypt.hash('Hack123!', salt),
        },
      });

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: hackerEmail1,
        password: 'Hack123!',
      });
      const hackerCookie = Array.isArray(loginRes.headers['set-cookie']) 
        ? loginRes.headers['set-cookie'][0] 
        : loginRes.headers['set-cookie'];

      const res = await request(app)
        .get(`/api/v1/documents/${testDocumentId}`)
        .set('Cookie', [hackerCookie]);
      
      expect(res.status).toBe(404); // Not found for that user
      
      // Cleanup
      await prisma.user.delete({ where: { email: hackerEmail1 } });
    });
  });

  describe('GET /api/v1/documents/:id/file (Security Check)', () => {
    it('should block unauthenticated access (401)', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${testDocumentId}/file`);
      
      expect(res.status).toBe(401);
    });

    it('should stream the file for the authenticated owner', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${testDocumentId}/file`)
        .set('Cookie', [authToken]);
      
      if (res.status === 404) {
        console.error('DEBUG 404 BODY:', res.body);
      }
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    it('should block access from another user (404/403)', async () => {
      const salt = await bcrypt.genSalt(10);
      await prisma.user.create({
        data: {
          name: 'Hacker',
          email: hackerEmail2,
          passwordHash: await bcrypt.hash('Hack123!', salt),
        },
      });

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: hackerEmail2,
        password: 'Hack123!',
      });
      const hackerCookie = Array.isArray(loginRes.headers['set-cookie']) 
        ? loginRes.headers['set-cookie'][0] 
        : loginRes.headers['set-cookie'];

      const res = await request(app)
        .get(`/api/v1/documents/${testDocumentId}/file`)
        .set('Cookie', [hackerCookie]);
      
      expect(res.status).toBe(404); // Hidden from Hacker
      await prisma.user.delete({ where: { email: hackerEmail2 } });
    });

    it('should handle missing physical file gracefully', async () => {
      // Create a dummy document record without actual file
      const dummyDoc = await prisma.document.create({
        data: {
          userId: (await prisma.user.findUnique({ where: { email: testUser.email } }))!.id,
          filename: 'ghost.pdf',
          fileUrl: '/uploads/documents/ghost.pdf',
          metadata: { savedFilename: 'does_not_exist.pdf', size: 100 },
        }
      });

      const res = await request(app)
        .get(`/api/v1/documents/${dummyDoc.id}/file`)
        .set('Cookie', [authToken]);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Physical file not found');

      await prisma.document.delete({ where: { id: dummyDoc.id } });
    });
  });

  describe('DELETE /api/v1/documents/:id', () => {
    it('should delete the document and physical file', async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${testDocumentId}`)
        .set('Cookie', [authToken]);
      
      expect(res.status).toBe(200);

      // Verify it's gone
      const getRes = await request(app)
        .get(`/api/v1/documents/${testDocumentId}`)
        .set('Cookie', [authToken]);
      expect(getRes.status).toBe(404);
    });
  });
});
