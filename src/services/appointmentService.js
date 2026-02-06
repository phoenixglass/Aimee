const { PrismaClient } = require('@prisma/client');
const { NotFoundError, ValidationError } = require('../utils/errors');

const prisma = new PrismaClient();

async function listAppointments({ salespersonId, accountId, upcoming, completed } = {}) {
  const where = {};
  if (salespersonId) where.salespersonId = Number(salespersonId);
  if (accountId) where.accountId = Number(accountId);
  if (upcoming) {
    where.scheduledAt = { gte: new Date() };
    where.cancelled = false;
    where.completed = false;
  }
  if (completed !== undefined) where.completed = completed === 'true' || completed === true;

  return prisma.appointment.findMany({
    where,
    include: {
      account: { select: { id: true, name: true, contactName: true, address: true, city: true } },
      salesperson: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

async function getAppointment(id) {
  const appt = await prisma.appointment.findUnique({
    where: { id: Number(id) },
    include: {
      account: true,
      salesperson: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
    },
  });
  if (!appt) throw new NotFoundError('Appointment');
  return appt;
}

async function createAppointment(data) {
  const scheduledAt = new Date(data.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    throw new ValidationError('Invalid scheduledAt date');
  }

  let reminderAt = null;
  if (data.reminderAt) {
    reminderAt = new Date(data.reminderAt);
    if (isNaN(reminderAt.getTime())) throw new ValidationError('Invalid reminderAt date');
  } else {
    // Default: remind 1 hour before
    reminderAt = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
  }

  return prisma.appointment.create({
    data: {
      salespersonId: Number(data.salespersonId),
      accountId: data.accountId ? Number(data.accountId) : null,
      title: data.title,
      notes: data.notes,
      scheduledAt,
      reminderAt,
    },
    include: {
      account: { select: { id: true, name: true } },
      salesperson: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function updateAppointment(id, data) {
  await getAppointment(id);
  const updateData = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.accountId !== undefined) updateData.accountId = data.accountId ? Number(data.accountId) : null;
  if (data.scheduledAt !== undefined) {
    updateData.scheduledAt = new Date(data.scheduledAt);
  }
  if (data.reminderAt !== undefined) {
    updateData.reminderAt = data.reminderAt ? new Date(data.reminderAt) : null;
  }
  if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
  if (data.cancelled !== undefined) updateData.cancelled = Boolean(data.cancelled);

  return prisma.appointment.update({
    where: { id: Number(id) },
    data: updateData,
    include: {
      account: { select: { id: true, name: true } },
      salesperson: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function getUpcomingReminders(salespersonId) {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  return prisma.appointment.findMany({
    where: {
      salespersonId: Number(salespersonId),
      cancelled: false,
      completed: false,
      reminderAt: { gte: now, lte: inOneHour },
    },
    include: {
      account: { select: { id: true, name: true, address: true, city: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

module.exports = { listAppointments, getAppointment, createAppointment, updateAppointment, getUpcomingReminders };
