const config = require('../config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

/**
 * Send an SMS via Twilio.
 *
 * @param {object} params
 * @param {string} params.to - Recipient phone number (E.164 format: +15551234567)
 * @param {string} params.body - Message text (max 1600 chars for Twilio)
 * @param {number} params.userId - Who triggered this send
 * @param {string} [params.templateKey] - Template identifier for logging
 * @param {string} [params.relatedType] - Related entity type
 * @param {number} [params.relatedId] - Related entity ID
 * @returns {object} - { success, messageSid, logId }
 */
async function sendSms(params) {
  const { accountSid, authToken, phoneNumber: fromNumber } = config.twilio;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials are not fully configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
  }

  // Log the attempt
  const log = await prisma.messageLog.create({
    data: {
      userId: params.userId,
      channel: 'sms',
      recipientTo: params.to,
      body: params.body,
      templateKey: params.templateKey || null,
      relatedType: params.relatedType || null,
      relatedId: params.relatedId || null,
      status: 'pending',
    },
  });

  try {
    const formBody = new URLSearchParams({
      To: params.to,
      From: fromNumber,
      Body: params.body,
    });

    const response = await fetch(
      `${TWILIO_BASE}/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      await prisma.messageLog.update({
        where: { id: log.id },
        data: { status: 'failed', errorDetail: `${data.code}: ${data.message}` },
      });
      throw new Error(`Twilio error (${data.code}): ${data.message}`);
    }

    await prisma.messageLog.update({
      where: { id: log.id },
      data: { status: 'sent', externalId: data.sid, sentAt: new Date() },
    });

    return { success: true, messageSid: data.sid, logId: log.id };
  } catch (err) {
    if (log.status !== 'failed') {
      await prisma.messageLog.update({
        where: { id: log.id },
        data: { status: 'failed', errorDetail: err.message },
      });
    }
    throw err;
  }
}

// ─── SMS TEMPLATES ───────────────────────────────────────────
// SMS must be concise (<160 chars ideal, 1600 max).

function buildOrderConfirmationSms(order) {
  const itemSummary = order.items
    .map((i) => `${i.quantity} ${i.unitType === 'case' ? 'cs' : 'btl'} ${i.wine.name}`)
    .join(', ');

  return `Order #${order.id} confirmed for ${order.account.name}: ${itemSummary}. Total: $${order.total.toFixed(2)}.`;
}

function buildShipmentNotificationSms(order, shipment) {
  let msg = `Order #${order.id} for ${order.account.name}: ${shipment.status}.`;
  if (shipment.trackingNumber) {
    msg += ` Tracking: ${shipment.trackingNumber}`;
  }
  if (shipment.estimatedDelivery) {
    msg += ` ETA: ${new Date(shipment.estimatedDelivery).toLocaleDateString()}`;
  }
  return msg;
}

function buildAppointmentReminderSms(appointment) {
  const timeStr = new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
  const dateStr = new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  let msg = `Reminder: ${appointment.title} on ${dateStr} at ${timeStr}`;
  if (appointment.account) {
    msg += ` at ${appointment.account.name}`;
  }
  return msg;
}

module.exports = {
  sendSms,
  buildOrderConfirmationSms,
  buildShipmentNotificationSms,
  buildAppointmentReminderSms,
};
