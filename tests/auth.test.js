const request = require('supertest');
const { seedTestDb, cleanupTestDb } = require('./setup');

// Must set env before requiring app
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const app = require('../src/app');

let testData;

beforeAll(async () => {
  testData = await seedTestDb();
});

afterAll(async () => {
  await cleanupTestDb();
});

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'test123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('admin@test.com');
      expect(res.body.user.role).toBe('admin');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('should reject unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'test123' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@test.com',
          password: 'newpass123',
          firstName: 'New',
          lastName: 'User',
          role: 'salesperson',
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('new@test.com');
      expect(res.body.firstName).toBe('New');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@test.com',
          password: 'test123',
          firstName: 'Dup',
          lastName: 'User',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return profile with valid token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'sales@test.com', password: 'test123' });

      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('sales@test.com');
      expect(res.body.firstName).toBe('Sales');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
