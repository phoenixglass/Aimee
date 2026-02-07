const request = require('supertest');
const { prisma, seedTestDb, cleanupTestDb } = require('./setup');

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
    .send({ email: 'sales@test.com', password: 'test123' });
  token = loginRes.body.token;
});

afterAll(async () => {
  await cleanupTestDb();
});

describe('Orders API', () => {
  let createdOrderId;

  describe('POST /api/orders', () => {
    it('should create an order with items', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: testData.account.id,
          items: [
            { wineId: testData.wine.id, quantity: 6, unitType: 'bottle' },
          ],
          notes: 'Test order',
          voiceTranscript: 'Order 6 bottles of test pinot noir',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending_confirmation');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(6);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.voiceTranscript).toBe('Order 6 bottles of test pinot noir');
      createdOrderId = res.body.id;
    });

    it('should reject order for non-existent account', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: 99999,
          items: [{ wineId: testData.wine.id, quantity: 1 }],
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/orders', () => {
    it('should list orders for salesperson', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/orders?status=pending_confirmation')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.forEach((order) => {
        expect(order.status).toBe('pending_confirmation');
      });
    });
  });

  describe('POST /api/orders/:id/confirm', () => {
    it('should confirm order and reserve inventory', async () => {
      // Get inventory before
      const invBefore = await prisma.inventory.findUnique({ where: { wineId: testData.wine.id } });

      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/confirm`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('confirmed');
      expect(res.body.confirmedDate).toBeDefined();

      // Check inventory was reserved
      const invAfter = await prisma.inventory.findUnique({ where: { wineId: testData.wine.id } });
      expect(invAfter.quantityAvailable).toBe(invBefore.quantityAvailable - 6);
      expect(invAfter.quantityReserved).toBe(invBefore.quantityReserved + 6);
    });

    it('should not confirm already confirmed order', async () => {
      const res = await request(app)
        .post(`/api/orders/${createdOrderId}/confirm`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot confirm/i);
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('should cancel and release inventory for confirmed order', async () => {
      // Create and confirm a new order first
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountId: testData.account.id,
          items: [{ wineId: testData.wine.id, quantity: 3, unitType: 'bottle' }],
        });
      const newOrderId = createRes.body.id;

      await request(app)
        .post(`/api/orders/${newOrderId}/confirm`)
        .set('Authorization', `Bearer ${token}`);

      const invBefore = await prisma.inventory.findUnique({ where: { wineId: testData.wine.id } });

      const res = await request(app)
        .post(`/api/orders/${newOrderId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');

      // Inventory should be released
      const invAfter = await prisma.inventory.findUnique({ where: { wineId: testData.wine.id } });
      expect(invAfter.quantityAvailable).toBe(invBefore.quantityAvailable + 3);
      expect(invAfter.quantityReserved).toBe(invBefore.quantityReserved - 3);
    });
  });
});
