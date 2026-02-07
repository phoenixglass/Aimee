const { PrismaClient } = require('@prisma/client');
const emailService = require('./emailService');
const smsService = require('./smsService');

const prisma = new PrismaClient();

/**
 * Send order confirmation to the account contact via email and/or SMS.
 */
async function notifyOrderConfirmed(orderId, userId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      account: true,
      items: { include: { wine: true } },
      salesperson: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!order) return { email: null, sms: null };

  const results = { email: null, sms: null };

  // Email the account contact
  if (order.account.email) {
    try {
      const template = emailService.buildOrderConfirmationEmail(order);
      results.email = await emailService.sendEmail({
        to: order.account.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        userId,
        templateKey: 'order_confirmation',
        relatedType: 'order',
        relatedId: order.id,
      });
    } catch (err) {
      results.email = { success: false, error: err.message };
    }
  }

  // SMS the account contact
  if (order.account.phone) {
    try {
      const body = smsService.buildOrderConfirmationSms(order);
      results.sms = await smsService.sendSms({
        to: normalizePhone(order.account.phone),
        body,
        userId,
        templateKey: 'order_confirmation',
        relatedType: 'order',
        relatedId: order.id,
      });
    } catch (err) {
      results.sms = { success: false, error: err.message };
    }
  }

  return results;
}

/**
 * Send shipment status update to the account contact.
 */
async function notifyShipmentUpdate(orderId, userId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { account: true, shipment: true, items: { include: { wine: true } } },
  });

  if (!order || !order.shipment) return { email: null, sms: null };

  const results = { email: null, sms: null };

  if (order.account.email) {
    try {
      const template = emailService.buildShipmentNotificationEmail(order, order.shipment);
      results.email = await emailService.sendEmail({
        to: order.account.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        userId,
        templateKey: 'shipment_update',
        relatedType: 'shipment',
        relatedId: order.shipment.id,
      });
    } catch (err) {
      results.email = { success: false, error: err.message };
    }
  }

  if (order.account.phone) {
    try {
      const body = smsService.buildShipmentNotificationSms(order, order.shipment);
      results.sms = await smsService.sendSms({
        to: normalizePhone(order.account.phone),
        body,
        userId,
        templateKey: 'shipment_update',
        relatedType: 'shipment',
        relatedId: order.shipment.id,
      });
    } catch (err) {
      results.sms = { success: false, error: err.message };
    }
  }

  return results;
}

/**
 * Send appointment reminder to the salesperson.
 */
async function notifyAppointmentReminder(appointmentId, userId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      account: { select: { name: true, address: true, city: true, state: true, phone: true } },
      salesperson: { select: { email: true, phone: true, firstName: true } },
    },
  });

  if (!appointment) return { email: null, sms: null };

  const results = { email: null, sms: null };

  // Email the salesperson
  if (appointment.salesperson.email) {
    try {
      const template = emailService.buildAppointmentReminderEmail(appointment);
      results.email = await emailService.sendEmail({
        to: appointment.salesperson.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        userId,
        templateKey: 'appointment_reminder',
        relatedType: 'appointment',
        relatedId: appointment.id,
      });
    } catch (err) {
      results.email = { success: false, error: err.message };
    }
  }

  // SMS the salesperson
  if (appointment.salesperson.phone) {
    try {
      const body = smsService.buildAppointmentReminderSms(appointment);
      results.sms = await smsService.sendSms({
        to: normalizePhone(appointment.salesperson.phone),
        body,
        userId,
        templateKey: 'appointment_reminder',
        relatedType: 'appointment',
        relatedId: appointment.id,
      });
    } catch (err) {
      results.sms = { success: false, error: err.message };
    }
  }

  return results;
}

/**
 * Send a quick custom message (voice-triggered ad hoc texts/emails).
 * e.g., "Text Thompson Restaurant that their Barolo is back in stock"
 */
async function sendQuickMessage({ channel, accountId, accountName, message, userId }) {
  let account;

  if (accountId) {
    account = await prisma.account.findUnique({ where: { id: Number(accountId) } });
  } else if (accountName) {
    account = await prisma.account.findFirst({
      where: {
        OR: [
          { name: { contains: accountName } },
          { contactName: { contains: accountName } },
        ],
        active: true,
      },
    });
  }

  if (!account) {
    return { success: false, error: `Account not found: ${accountName || accountId}` };
  }

  if (channel === 'email') {
    if (!account.email) return { success: false, error: `${account.name} has no email on file` };
    return emailService.sendEmail({
      to: account.email,
      subject: `Message from your wine rep`,
      text: message,
      userId,
      templateKey: 'quick_message',
      relatedType: 'general',
    });
  }

  if (channel === 'sms') {
    if (!account.phone) return { success: false, error: `${account.name} has no phone on file` };
    return smsService.sendSms({
      to: normalizePhone(account.phone),
      body: message,
      userId,
      templateKey: 'quick_message',
      relatedType: 'general',
    });
  }

  return { success: false, error: `Unknown channel: ${channel}` };
}

/**
 * Get message history for a user.
 */
async function getMessageHistory({ userId, channel, relatedType, limit = 50 }) {
  const where = {};
  if (userId) where.userId = Number(userId);
  if (channel) where.channel = channel;
  if (relatedType) where.relatedType = relatedType;

  return prisma.messageLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { firstName: true, lastName: true } } },
  });
}

/**
 * Normalize phone numbers to E.164 format for Twilio.
 * Simple US-focused normalization. In production, use a library like libphonenumber.
 */
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.startsWith('+')) return phone;
  return `+${digits}`;
}

module.exports = {
  notifyOrderConfirmed,
  notifyShipmentUpdate,
  notifyAppointmentReminder,
  sendQuickMessage,
  getMessageHistory,
};
