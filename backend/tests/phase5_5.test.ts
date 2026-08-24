import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Phase 5.5 Functional Audit Routes', () => {
  let userToken: string;
  let adminToken: string;
  let testUser: any;
  let adminUser: any;
  const uniqueUserEmail = `user55_${uuidv4()}@test.com`;
  const uniqueAdminEmail = `admin55_${uuidv4()}@test.com`;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create User
    testUser = await prisma.user.create({
      data: {
        email: uniqueUserEmail,
        name: 'Test User',
        passwordHash,
        role: 'USER',
      },
    });

    // Create Admin
    adminUser = await prisma.user.create({
      data: {
        email: uniqueAdminEmail,
        name: 'Admin User',
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Login User
    let res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: uniqueUserEmail, password: 'password123' });
    
    // Extract token from Set-Cookie header
    const cookie = res.headers['set-cookie'][0];
    userToken = cookie.split(';')[0].split('=')[1];

    // Login Admin
    res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: uniqueAdminEmail, password: 'password123' });
    
    const adminCookie = res.headers['set-cookie'][0];
    adminToken = adminCookie.split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [testUser.id, adminUser.id] } }
    });
    await prisma.$disconnect();
  });

  describe('User Dashboard API', () => {
    it('should return aggregated dashboard stats for user', async () => {
      const res = await request(app)
        .get('/api/v1/users/dashboard')
        .set('Cookie', [`token=${userToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalDocuments');
      expect(res.body.data).toHaveProperty('quizzesTaken');
      expect(res.body.data).toHaveProperty('studyTime');
    });
  });

  describe('Admin APIs', () => {
    it('should block normal users from admin stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Cookie', [`token=${userToken}`]);

      expect(res.status).toBe(403);
    });

    it('should return system stats for admins', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(2);
    });

    it('should return users list for admins', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Knowledge APIs (Quizzes & Flashcards empty states)', () => {
    it('should return empty list of quizzes', async () => {
      const res = await request(app)
        .get('/api/v1/quizzes')
        .set('Cookie', [`token=${userToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return empty list of flashcards', async () => {
      const res = await request(app)
        .get('/api/v1/flashcards')
        .set('Cookie', [`token=${userToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
