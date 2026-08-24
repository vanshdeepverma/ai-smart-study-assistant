import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Chat API', () => {
  let token: string;
  let testUser: any;
  let sessionId: string;
  const uniqueEmail = `chatuser_${uuidv4()}@test.com`;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    testUser = await prisma.user.create({
      data: { email: uniqueEmail, name: 'Chat User', passwordHash },
    });

    const res = await request(app).post('/api/v1/auth/login').send({ email: uniqueEmail, password: 'password123' });
    token = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
  });

  it('should create a new chat session', async () => {
    const res = await request(app)
      .post('/api/v1/chat/sessions')
      .set('Cookie', [`token=${token}`])
      .send({ title: 'Math Help' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Math Help');
    sessionId = res.body.data.id;
  });

  it('should list chat sessions', async () => {
    const res = await request(app)
      .get('/api/v1/chat/sessions')
      .set('Cookie', [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(sessionId);
  });

  it('should add a message to a session', async () => {
    const res = await request(app)
      .post(`/api/v1/chat/sessions/${sessionId}/messages`)
      .set('Cookie', [`token=${token}`])
      .send({ content: 'What is calculus?', studyMode: 'EXPLAIN' });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('What is calculus?');
    expect(res.body.data.role).toBe('USER');
    expect(res.body.data.studyMode).toBe('EXPLAIN');
  });

  it('should list messages for a session', async () => {
    const res = await request(app)
      .get(`/api/v1/chat/sessions/${sessionId}/messages`)
      .set('Cookie', [`token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].content).toBe('What is calculus?');
  });
});
