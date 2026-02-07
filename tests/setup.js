/**
 * Test setup: uses a separate test database and seeds it before each suite.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Use test database
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();

async function seedTestDb() {
  // Clear all tables in dependency order
  await prisma.queryLog.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.account.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.wine.deleteMany();
  await prisma.producer.deleteMany();
  await prisma.region.deleteMany();
  await prisma.grapeVariety.deleteMany();
  await prisma.pronunciationEntry.deleteMany();
  await prisma.user.deleteMany();

  // Seed minimal test data
  const hash = await bcrypt.hash('test123', 10);

  const admin = await prisma.user.create({
    data: { email: 'admin@test.com', passwordHash: hash, firstName: 'Admin', lastName: 'Test', role: 'admin' },
  });

  const sales = await prisma.user.create({
    data: { email: 'sales@test.com', passwordHash: hash, firstName: 'Sales', lastName: 'Rep', phone: '555-0001', role: 'salesperson' },
  });

  const region = await prisma.region.create({
    data: {
      name: 'Bordeaux', country: 'France', languageOrigin: 'fr',
      phoneticSimple: 'bor-DOH',
      alternateHearings: JSON.stringify(['bordo', 'bore dough']),
    },
  });

  const grape = await prisma.grapeVariety.create({
    data: {
      name: 'Pinot Noir', languageOrigin: 'fr',
      phoneticSimple: 'PEE-noh NWAHR',
      alternateHearings: JSON.stringify(['pee no nwar', 'peanut noir']),
    },
  });

  const producer = await prisma.producer.create({
    data: { name: 'Test Winery', regionId: region.id, languageOrigin: 'en' },
  });

  const wine = await prisma.wine.create({
    data: {
      name: 'Test Pinot Noir', vintage: 2021, grapeVarietyId: grape.id,
      regionId: region.id, producerId: producer.id, sku: 'TEST-PN-2021',
      priceWholesale: 25.00, priceRetail: 40.00, languageOrigin: 'fr',
      phoneticSimple: 'test PEE-noh NWAHR',
      alternateHearings: JSON.stringify(['test pee no nwar']),
    },
  });

  await prisma.inventory.create({
    data: { wineId: wine.id, quantityAvailable: 100, reorderPoint: 10 },
  });

  const account = await prisma.account.create({
    data: {
      name: 'Test Restaurant', contactName: 'John Doe', email: 'john@test.com',
      phone: '555-1111', city: 'Portland', state: 'OR',
      accountType: 'restaurant', salespersonId: sales.id,
    },
  });

  await prisma.pronunciationEntry.create({
    data: {
      term: 'Terroir', category: 'general', language: 'fr',
      phoneticSimple: 'teh-RWAHR',
      alternateHearings: JSON.stringify(['teh war', 'terr wah', 'terroir']),
    },
  });

  return { admin, sales, region, grape, producer, wine, account };
}

async function cleanupTestDb() {
  await prisma.$disconnect();
}

module.exports = { prisma, seedTestDb, cleanupTestDb };
