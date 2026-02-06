const { PrismaClient } = require('@prisma/client');
const { NotFoundError } = require('../utils/errors');
const { parseJsonField } = require('../utils/validators');

const prisma = new PrismaClient();

async function listWines({ search, grapeVarietyId, regionId, producerId, active = true } = {}) {
  const where = { active };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { appellation: { contains: search } },
      { description: { contains: search } },
      { sku: { contains: search } },
    ];
  }
  if (grapeVarietyId) where.grapeVarietyId = Number(grapeVarietyId);
  if (regionId) where.regionId = Number(regionId);
  if (producerId) where.producerId = Number(producerId);

  return prisma.wine.findMany({
    where,
    include: {
      grapeVariety: true,
      region: true,
      producer: true,
      inventory: true,
    },
    orderBy: { name: 'asc' },
  });
}

async function getWine(id) {
  const wine = await prisma.wine.findUnique({
    where: { id: Number(id) },
    include: {
      grapeVariety: true,
      region: true,
      producer: true,
      inventory: true,
    },
  });
  if (!wine) throw new NotFoundError('Wine');
  return wine;
}

async function createWine(data) {
  data.alternateHearings = parseJsonField(data.alternateHearings, 'alternateHearings');

  const wine = await prisma.wine.create({
    data: {
      name: data.name,
      vintage: data.vintage ? Number(data.vintage) : null,
      grapeVarietyId: data.grapeVarietyId ? Number(data.grapeVarietyId) : null,
      regionId: data.regionId ? Number(data.regionId) : null,
      producerId: data.producerId ? Number(data.producerId) : null,
      appellation: data.appellation,
      sku: data.sku,
      description: data.description,
      priceWholesale: Number(data.priceWholesale),
      priceRetail: data.priceRetail ? Number(data.priceRetail) : null,
      bottleSize: data.bottleSize || '750ml',
      caseSize: data.caseSize ? Number(data.caseSize) : 12,
      languageOrigin: data.languageOrigin || 'en',
      phoneticIpa: data.phoneticIpa,
      phoneticSimple: data.phoneticSimple,
      ssmlPronunciation: data.ssmlPronunciation,
      alternateHearings: data.alternateHearings,
    },
    include: { grapeVariety: true, region: true, producer: true },
  });

  // Create inventory record
  if (data.initialStock !== undefined) {
    await prisma.inventory.create({
      data: {
        wineId: wine.id,
        quantityAvailable: Number(data.initialStock),
        warehouseLocation: data.warehouseLocation,
        reorderPoint: data.reorderPoint ? Number(data.reorderPoint) : 0,
      },
    });
  }

  return getWine(wine.id);
}

async function updateWine(id, data) {
  await getWine(id); // ensure exists

  if (data.alternateHearings !== undefined) {
    data.alternateHearings = parseJsonField(data.alternateHearings, 'alternateHearings');
  }

  const updateData = {};
  const fields = [
    'name', 'vintage', 'appellation', 'sku', 'description',
    'priceWholesale', 'priceRetail', 'bottleSize', 'caseSize',
    'languageOrigin', 'phoneticIpa', 'phoneticSimple', 'ssmlPronunciation',
    'alternateHearings', 'active', 'grapeVarietyId', 'regionId', 'producerId',
  ];
  for (const field of fields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  // Coerce numeric fields
  if (updateData.vintage) updateData.vintage = Number(updateData.vintage);
  if (updateData.priceWholesale) updateData.priceWholesale = Number(updateData.priceWholesale);
  if (updateData.priceRetail) updateData.priceRetail = Number(updateData.priceRetail);
  if (updateData.caseSize) updateData.caseSize = Number(updateData.caseSize);
  if (updateData.grapeVarietyId) updateData.grapeVarietyId = Number(updateData.grapeVarietyId);
  if (updateData.regionId) updateData.regionId = Number(updateData.regionId);
  if (updateData.producerId) updateData.producerId = Number(updateData.producerId);

  await prisma.wine.update({ where: { id: Number(id) }, data: updateData });
  return getWine(id);
}

async function deleteWine(id) {
  await getWine(id);
  await prisma.wine.update({ where: { id: Number(id) }, data: { active: false } });
  return { message: 'Wine deactivated' };
}

// Inventory operations
async function getInventory(wineId) {
  const inv = await prisma.inventory.findUnique({ where: { wineId: Number(wineId) } });
  if (!inv) throw new NotFoundError('Inventory record');
  return inv;
}

async function updateInventory(wineId, data) {
  const inv = await prisma.inventory.upsert({
    where: { wineId: Number(wineId) },
    update: {
      quantityAvailable: data.quantityAvailable !== undefined ? Number(data.quantityAvailable) : undefined,
      quantityReserved: data.quantityReserved !== undefined ? Number(data.quantityReserved) : undefined,
      warehouseLocation: data.warehouseLocation,
      reorderPoint: data.reorderPoint !== undefined ? Number(data.reorderPoint) : undefined,
    },
    create: {
      wineId: Number(wineId),
      quantityAvailable: Number(data.quantityAvailable || 0),
      quantityReserved: Number(data.quantityReserved || 0),
      warehouseLocation: data.warehouseLocation,
      reorderPoint: Number(data.reorderPoint || 0),
    },
  });
  return inv;
}

module.exports = {
  listWines, getWine, createWine, updateWine, deleteWine,
  getInventory, updateInventory,
};
