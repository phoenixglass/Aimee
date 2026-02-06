const { PrismaClient } = require('@prisma/client');
const { NotFoundError, ValidationError } = require('../utils/errors');

const prisma = new PrismaClient();

const ORDER_STATUSES = ['draft', 'pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const includeAll = {
  account: true,
  salesperson: { select: { id: true, firstName: true, lastName: true, email: true } },
  items: { include: { wine: { include: { grapeVariety: true, producer: true } } } },
  shipment: true,
};

async function listOrders({ salespersonId, accountId, status } = {}) {
  const where = {};
  if (salespersonId) where.salespersonId = Number(salespersonId);
  if (accountId) where.accountId = Number(accountId);
  if (status) where.status = status;

  return prisma.order.findMany({
    where,
    include: includeAll,
    orderBy: { orderDate: 'desc' },
  });
}

async function getOrder(id) {
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: includeAll,
  });
  if (!order) throw new NotFoundError('Order');
  return order;
}

async function createOrder({ accountId, salespersonId, items, notes, voiceTranscript }) {
  // Validate that account and wines exist
  const account = await prisma.account.findUnique({ where: { id: Number(accountId) } });
  if (!account) throw new NotFoundError('Account');

  // Build order items and calculate total
  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const wine = await prisma.wine.findUnique({
      where: { id: Number(item.wineId) },
      include: { inventory: true },
    });
    if (!wine) throw new NotFoundError(`Wine (id: ${item.wineId})`);

    const qty = Number(item.quantity);
    const unitType = item.unitType || 'bottle';
    const unitPrice = unitType === 'case' ? wine.priceWholesale * wine.caseSize : wine.priceWholesale;
    const lineTotal = unitPrice * qty;
    total += lineTotal;

    orderItems.push({
      wineId: wine.id,
      quantity: qty,
      unitType,
      unitPrice,
      lineTotal,
    });
  }

  const order = await prisma.order.create({
    data: {
      accountId: Number(accountId),
      salespersonId: Number(salespersonId),
      status: 'pending_confirmation',
      total,
      notes,
      voiceTranscript,
      items: { create: orderItems },
    },
    include: includeAll,
  });

  return order;
}

async function confirmOrder(id) {
  const order = await getOrder(id);
  if (order.status !== 'pending_confirmation') {
    throw new ValidationError(`Cannot confirm order in '${order.status}' status`);
  }

  // Reserve inventory for each item
  for (const item of order.items) {
    const effectiveQty = item.unitType === 'case'
      ? item.quantity * (item.wine.caseSize || 12)
      : item.quantity;

    const inv = await prisma.inventory.findUnique({ where: { wineId: item.wineId } });
    if (inv && inv.quantityAvailable < effectiveQty) {
      throw new ValidationError(
        `Insufficient stock for ${item.wine.name}: ${inv.quantityAvailable} available, ${effectiveQty} requested`
      );
    }

    if (inv) {
      await prisma.inventory.update({
        where: { wineId: item.wineId },
        data: {
          quantityAvailable: { decrement: effectiveQty },
          quantityReserved: { increment: effectiveQty },
        },
      });
    }
  }

  return prisma.order.update({
    where: { id: Number(id) },
    data: { status: 'confirmed', confirmedDate: new Date() },
    include: includeAll,
  });
}

async function updateOrderStatus(id, status) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`);
  }
  await getOrder(id);
  return prisma.order.update({
    where: { id: Number(id) },
    data: { status },
    include: includeAll,
  });
}

async function cancelOrder(id) {
  const order = await getOrder(id);
  if (['delivered', 'cancelled'].includes(order.status)) {
    throw new ValidationError(`Cannot cancel order in '${order.status}' status`);
  }

  // Release reserved inventory if order was confirmed
  if (['confirmed', 'processing'].includes(order.status)) {
    for (const item of order.items) {
      const effectiveQty = item.unitType === 'case'
        ? item.quantity * (item.wine.caseSize || 12)
        : item.quantity;

      await prisma.inventory.update({
        where: { wineId: item.wineId },
        data: {
          quantityAvailable: { increment: effectiveQty },
          quantityReserved: { decrement: effectiveQty },
        },
      });
    }
  }

  return prisma.order.update({
    where: { id: Number(id) },
    data: { status: 'cancelled' },
    include: includeAll,
  });
}

module.exports = { listOrders, getOrder, createOrder, confirmOrder, updateOrderStatus, cancelOrder };
