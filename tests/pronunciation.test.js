const request = require('supertest');
const { seedTestDb, cleanupTestDb } = require('./setup');

process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const app = require('../src/app');

let testData;
let token;

beforeAll(async () => {
  testData = await seedTestDb();
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'test123' });
  token = loginRes.body.token;
});

afterAll(async () => {
  await cleanupTestDb();
});

describe('Pronunciation API', () => {
  describe('GET /api/pronunciation', () => {
    it('should list pronunciation entries', async () => {
      const res = await request(app)
        .get('/api/pronunciation')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/pronunciation/match', () => {
    it('should match exact term', async () => {
      const res = await request(app)
        .post('/api/pronunciation/match')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'terroir' });

      expect(res.status).toBe(200);
      expect(res.body.matches.length).toBeGreaterThan(0);
      const match = res.body.matches.find((m) => m.entry?.term === 'Terroir' || m.name === 'Terroir');
      expect(match).toBeDefined();
    });

    it('should match alternate hearing', async () => {
      const res = await request(app)
        .post('/api/pronunciation/match')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'teh war' });

      expect(res.status).toBe(200);
      expect(res.body.matches.length).toBeGreaterThan(0);
    });

    it('should match wine by alternate hearing', async () => {
      const res = await request(app)
        .post('/api/pronunciation/match')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'pee no nwar' });

      expect(res.status).toBe(200);
      expect(res.body.matches.length).toBeGreaterThan(0);
      // Should find Pinot Noir grape
      const grapeMatch = res.body.matches.find((m) => m.entity === 'grape' || m.name === 'Pinot Noir');
      expect(grapeMatch).toBeDefined();
    });

    it('should match region by alternate hearing', async () => {
      const res = await request(app)
        .post('/api/pronunciation/match')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'bore dough' });

      expect(res.status).toBe(200);
      expect(res.body.matches.length).toBeGreaterThan(0);
    });

    it('should return empty for unrecognized term', async () => {
      const res = await request(app)
        .post('/api/pronunciation/match')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'xyzzy gibberish' });

      expect(res.status).toBe(200);
      expect(res.body.matches.length).toBe(0);
    });
  });

  describe('CRUD operations', () => {
    let entryId;

    it('should create a pronunciation entry', async () => {
      const res = await request(app)
        .post('/api/pronunciation')
        .set('Authorization', `Bearer ${token}`)
        .send({
          term: 'Montrachet',
          category: 'region',
          language: 'fr',
          phoneticSimple: 'mohn-rah-SHAY',
          alternateHearings: ['mon ra shay', 'montrachet', 'mon rash ay'],
        });

      expect(res.status).toBe(201);
      expect(res.body.term).toBe('Montrachet');
      entryId = res.body.id;
    });

    it('should update a pronunciation entry', async () => {
      const res = await request(app)
        .put(`/api/pronunciation/${entryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ phoneticIpa: '/mɔ̃ʁaʃɛ/' });

      expect(res.status).toBe(200);
      expect(res.body.phoneticIpa).toBe('/mɔ̃ʁaʃɛ/');
    });

    it('should delete a pronunciation entry', async () => {
      const res = await request(app)
        .delete(`/api/pronunciation/${entryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
