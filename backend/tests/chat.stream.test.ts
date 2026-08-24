import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import { AIProvider, ChatMessageInput } from '../src/services/ai/AIProvider.interface';
import { setAIProvider } from '../src/services/chat.service';
import { v4 as uuidv4 } from 'uuid';

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

describe('Chat Streaming API', () => {
  let authToken: string;
  let testSessionId: string;
  let testUserId: string;
  const uniqueEmail = `streamer_${uuidv4()}@test.com`;

  beforeAll(async () => {
    // Register test user
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        password: 'Password123!',
        name: 'Stream Test'
      });
      
    testUserId = registerRes.body.data.id;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail, password: 'Password123!' });

    authToken = loginRes.headers['set-cookie'][0];

    // Create a chat session
    const sessionRes = await request(app)
      .post('/api/v1/chat/sessions')
      .set('Cookie', [authToken])
      .send({ title: 'Stream Test' });

    testSessionId = sessionRes.body.data.id;

    // Inject Mock Provider
    setAIProvider(new MockAIProvider());
    
    // Mock RAG to bypass the short-circuit for these streaming tests
    jest.spyOn(require('../src/services/rag.service').RAGService, 'findSimilarChunks').mockResolvedValue([{
      id: 'chunk1', documentId: 'doc1', content: 'dummy', pageNumber: 1, filename: 'dummy.pdf', similarity: 0.99
    }]);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.chatMessage.deleteMany({ where: { sessionId: testSessionId } });
    await prisma.chatSession.deleteMany({ where: { id: testSessionId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('should stream AI response and save both messages', async () => {
    // We can't easily read SSE stream with supertest directly without a custom parser,
    // but we can send the request and verify it returns 200 and eventually creates DB records.
    
    // Instead of waiting for full streaming (which supertest can handle if it buffers), 
    // we buffer it.
    const res = await request(app)
      .post(`/api/v1/chat/sessions/${testSessionId}/messages/stream`)
      .set('Cookie', [authToken])
      .send({ content: 'Hello AI' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    
    // Validate the stream output format
    expect(res.text).toContain('event: token\ndata: {"chunk":"Hello"}');
    expect(res.text).toContain('event: token\ndata: {"chunk":" world"}');
    expect(res.text).toContain('event: done\ndata: {"done":true}');

    // Allow background DB write to finish
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify messages were saved
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: testSessionId },
      orderBy: { createdAt: 'asc' }
    });

    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('USER');
    expect(messages[0].content).toBe('Hello AI');
    expect(messages[1].role).toBe('ASSISTANT');
    expect(messages[1].content).toBe('Hello world from mock AI.');
  });
});

class Mock429AIProvider implements AIProvider {
  initialize(): void {}
  async *streamChat(): AsyncGenerator<string, void, unknown> {
    throw new Error('AI_QUOTA_EXCEEDED');
  }
  async generateJson(): Promise<string> {
    throw new Error('AI_QUOTA_EXCEEDED');
  }
}

class MockErrorAIProvider implements AIProvider {
  initialize(): void {}
  async *streamChat(): AsyncGenerator<string, void, unknown> {
    throw new Error('AI_PROVIDER_ERROR');
  }
  async generateJson(): Promise<string> {
    throw new Error('AI_PROVIDER_ERROR');
  }
}

describe('Gemini API Quota Handling Tests', () => {
  let authToken: string;
  let testSessionId: string;
  let testUserId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: `quota_${uuidv4()}@test.com`, password: 'Password123!', name: 'Quota Tester' });
    testUserId = res.body.data.id;
    authToken = res.headers['set-cookie'][0];
    
    const sessionRes = await request(app)
      .post('/api/v1/chat/sessions')
      .set('Cookie', [authToken])
      .send({ title: 'Quota Test' });
    testSessionId = sessionRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.chatMessage.deleteMany({ where: { sessionId: testSessionId } });
    await prisma.chatSession.deleteMany({ where: { id: testSessionId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('C. Gemini 429 daily quota -> friendly error', async () => {
    setAIProvider(new Mock429AIProvider());
    
    // Mock RAG to bypass the short-circuit
    jest.spyOn(require('../src/services/rag.service').RAGService, 'findSimilarChunks').mockResolvedValue([{
      id: 'chunk1', documentId: 'doc1', content: 'dummy', pageNumber: 1, filename: 'dummy.pdf', similarity: 0.99
    }]);

    const res = await request(app)
      .post(`/api/v1/chat/sessions/${testSessionId}/messages/stream`)
      .set('Cookie', [authToken])
      .send({ content: 'Hello' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: error\ndata: {"error":"AI usage limit reached. Please try again later or configure another Gemini API key/project."}');
  });

  it('D. Gemini other error -> friendly error', async () => {
    setAIProvider(new MockErrorAIProvider());
    
    // Mock RAG to bypass the short-circuit
    jest.spyOn(require('../src/services/rag.service').RAGService, 'findSimilarChunks').mockResolvedValue([{
      id: 'chunk1', documentId: 'doc1', content: 'dummy', pageNumber: 1, filename: 'dummy.pdf', similarity: 0.99
    }]);

    const res = await request(app)
      .post(`/api/v1/chat/sessions/${testSessionId}/messages/stream`)
      .set('Cookie', [authToken])
      .send({ content: 'Hello again' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: error\ndata: {"error":"AI Provider encountered an error. Please try again later."}');
  });
});
