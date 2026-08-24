import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('Auth API', () => {
  const uniqueEmail = `auth_test_${uuidv4()}@smartstudy.com`;
  const uniqueAdminEmail = `admin_test_${uuidv4()}@smartstudy.com`;

  const testUser = {
    name: 'Auth Test User',
    email: uniqueEmail,
    password: 'SecurePassword123!',
  };

  let testAdminToken: string;
  beforeAll(async () => {
    // Create an admin for RBAC testing
    const salt = await bcrypt.genSalt(10);
    await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: uniqueAdminEmail,
        passwordHash: await bcrypt.hash('AdminPassword123!', salt),
        role: 'ADMIN',
      },
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: uniqueAdminEmail,
      password: 'AdminPassword123!',
    });
    
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      testAdminToken = cookieArray.find((c: string) => c.startsWith('token=')) || '';
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, uniqueAdminEmail] } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.passwordHash).toBeUndefined(); // Should not return hash
      expect(res.headers['set-cookie']).toBeDefined(); // Should set HttpOnly cookie
    });

    it('should fail with duplicate email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should fail with weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        ...testUser,
        email: 'weak@example.com',
        password: 'weak',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword123!',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Protected Routes', () => {
    it('should block unauthenticated access to /me', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should allow ADMIN access to /admin-test', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-test')
        .set('Cookie', [testAdminToken]);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Welcome Admin');
    });

    it('should block normal user from ADMIN endpoints', async () => {
      // First login as normal user
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });
      const userCookie = loginRes.headers['set-cookie'][0];

      // Then try accessing admin route
      const adminRes = await request(app)
        .get('/api/v1/auth/admin-test')
        .set('Cookie', [userCookie]);

      expect(adminRes.status).toBe(403);
      expect(adminRes.body.error.code).toBe('FORBIDDEN');
    });
  });
});
