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

describe('Wines API', () => {
  describe('GET /api/wines', () => {
    it('should list wines', async () => {
      const res = await request(app)
        .get('/api/wines')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name).toBeDefined();
      expect(res.body[0].grapeVariety).toBeDefined();
      expect(res.body[0].region).toBeDefined();
    });

    it('should require auth', async () => {
      const res = await request(app).get('/api/wines');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/wines/:id', () => {
    it('should get wine by id with pronunciation data', async () => {
      const res = await request(app)
        .get(`/api/wines/${testData.wine.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Pinot Noir');
      expect(res.body.phoneticSimple).toBe('test PEE-noh NWAHR');
      expect(res.body.inventory).toBeDefined();
      expect(res.body.inventory.quantityAvailable).toBe(100);
    });

    it('should return 404 for non-existent wine', async () => {
      const res = await request(app)
        .get('/api/wines/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/wines', () => {
    it('should create a wine', async () => {
      const res = await request(app)
        .post('/api/wines')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Chardonnay',
          priceWholesale: 20.00,
          languageOrigin: 'fr',
          phoneticSimple: 'shar-doh-NAY',
          alternateHearings: ['shar done ay', 'chardon ay'],
          initialStock: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('New Chardonnay');
      expect(res.body.inventory.quantityAvailable).toBe(50);
    });
  });

  describe('PUT /api/wines/:id', () => {
    it('should update wine price', async () => {
      const res = await request(app)
        .put(`/api/wines/${testData.wine.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ priceWholesale: 30.00 });

      expect(res.status).toBe(200);
      expect(res.body.priceWholesale).toBe(30);
    });
  });

  describe('DELETE /api/wines/:id', () => {
    it('should soft-delete (deactivate) wine', async () => {
      const res = await request(app)
        .delete(`/api/wines/${testData.wine.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deactivated/i);
    });
  });

  describe('Inventory', () => {
    it('should get inventory for a wine', async () => {
      const res = await request(app)
        .get(`/api/wines/${testData.wine.id}/inventory`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.quantityAvailable).toBeDefined();
    });

    it('should update inventory', async () => {
      const res = await request(app)
        .put(`/api/wines/${testData.wine.id}/inventory`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantityAvailable: 200 });

      expect(res.status).toBe(200);
      expect(res.body.quantityAvailable).toBe(200);
    });
  });
});
