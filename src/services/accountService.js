const { PrismaClient } = require('@prisma/client');
const { NotFoundError } = require('../utils/errors');

const prisma = new PrismaClient();

async function listAccounts({ salespersonId, accountType, search, active = true } = {}) {
  const where = { active };
  if (salespersonId) where.salespersonId = Number(salespersonId);
  if (accountType) where.accountType = accountType;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { contactName: { contains: search } },
      { city: { contains: search } },
    ];
  }

  return prisma.account.findMany({
    where,
    include: {
      salesperson: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { name: 'asc' },
  });
}

async function getAccount(id) {
  const account = await prisma.account.findUnique({
    where: { id: Number(id) },
    include: {
      salesperson: { select: { id: true, firstName: true, lastName: true, email: true } },
      orders: { orderBy: { orderDate: 'desc' }, take: 10, include: { items: { include: { wine: true } } } },
      appointments: { orderBy: { scheduledAt: 'desc' }, take: 5 },
    },
  });
  if (!account) throw new NotFoundError('Account');
  return account;
}

async function createAccount(data) {
  return prisma.account.create({
    data: {
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      accountType: data.accountType || 'restaurant',
      salespersonId: data.salespersonId ? Number(data.salespersonId) : null,
      notes: data.notes,
    },
    include: { salesperson: { select: { id: true, firstName: true, lastName: true } } },
  });
}

async function updateAccount(id, data) {
  await getAccount(id);
  const updateData = {};
  const fields = [
    'name', 'contactName', 'email', 'phone', 'address', 'city', 'state', 'zip',
    'accountType', 'notes', 'active',
  ];
  for (const field of fields) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }
  if (data.salespersonId !== undefined) {
    updateData.salespersonId = data.salespersonId ? Number(data.salespersonId) : null;
  }

  return prisma.account.update({
    where: { id: Number(id) },
    data: updateData,
    include: { salesperson: { select: { id: true, firstName: true, lastName: true } } },
  });
}

module.exports = { listAccounts, getAccount, createAccount, updateAccount };
