const config = require('../config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SENDGRID_BASE = 'https://api.sendgrid.com/v3';

/**
 * Send an email via SendGrid.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.text - Plain text body
 * @param {string} [params.html] - HTML body (optional, falls back to text)
 * @param {string} [params.from] - Sender email (defaults to config)
 * @param {number} params.userId - Who triggered this send
 * @param {string} [params.templateKey] - Template identifier for logging
 * @param {string} [params.relatedType] - Related entity type (order, appointment, etc.)
 * @param {number} [params.relatedId] - Related entity ID
 * @returns {object} - { success, messageId, logId }
 */
async function sendEmail(params) {
  const apiKey = config.sendgrid.apiKey;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  const from = params.from || config.sendgrid.fromEmail || 'noreply@aimee.app';

  const payload = {
    personalizations: [{ to: [{ email: params.to }] }],
    from: { email: from, name: 'Aimee Wine Assistant' },
    subject: params.subject,
    content: [
      { type: 'text/plain', value: params.text },
    ],
  };

  if (params.html) {
    payload.content.push({ type: 'text/html', value: params.html });
  }

  // Log the attempt
  const log = await prisma.messageLog.create({
    data: {
      userId: params.userId,
      channel: 'email',
      recipientTo: params.to,
      subject: params.subject,
      body: params.html || params.text,
      templateKey: params.templateKey || null,
      relatedType: params.relatedType || null,
      relatedId: params.relatedId || null,
      status: 'pending',
    },
  });

  try {
    const response = await fetch(`${SENDGRID_BASE}/mail/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      await prisma.messageLog.update({
        where: { id: log.id },
        data: { status: 'failed', errorDetail: `${response.status}: ${errorBody}` },
      });
      throw new Error(`SendGrid error (${response.status}): ${errorBody}`);
    }

    const messageId = response.headers.get('x-message-id') || null;
    await prisma.messageLog.update({
      where: { id: log.id },
      data: { status: 'sent', externalId: messageId, sentAt: new Date() },
    });

    return { success: true, messageId, logId: log.id };
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

// ─── EMAIL TEMPLATES ─────────────────────────────────────────

function buildOrderConfirmationEmail(order) {
  const items = order.items.map((item) =>
    `  - ${item.quantity} ${item.unitType}${item.quantity > 1 ? 's' : ''} of ${item.wine.name} ` +
    `@ $${item.unitPrice.toFixed(2)} = $${item.lineTotal.toFixed(2)}`
  ).join('\n');

  const text = `Order Confirmation #${order.id}\n\n` +
    `Account: ${order.account.name}\n` +
    `Date: ${new Date(order.confirmedDate || order.orderDate).toLocaleDateString()}\n\n` +
    `Items:\n${items}\n\n` +
    `Total: $${order.total.toFixed(2)}\n\n` +
    `Thank you for your order! We'll send tracking info once it ships.`;

  const html = `
    <h2>Order Confirmation #${order.id}</h2>
    <p><strong>Account:</strong> ${order.account.name}</p>
    <p><strong>Date:</strong> ${new Date(order.confirmedDate || order.orderDate).toLocaleDateString()}</p>
    <h3>Items</h3>
    <table style="border-collapse:collapse;width:100%">
      <tr style="background:#f4f4f4"><th style="padding:8px;text-align:left">Wine</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
      ${order.items.map((item) => `
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:8px">${item.wine.name}${item.wine.vintage ? ` (${item.wine.vintage})` : ''}</td>
          <td style="padding:8px;text-align:center">${item.quantity} ${item.unitType}${item.quantity > 1 ? 's' : ''}</td>
          <td style="padding:8px;text-align:right">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding:8px;text-align:right">$${item.lineTotal.toFixed(2)}</td>
        </tr>
      `).join('')}
    </table>
    <p style="font-size:18px;margin-top:16px"><strong>Total: $${order.total.toFixed(2)}</strong></p>
    <p>Thank you for your order! We'll send tracking info once it ships.</p>
  `;

  return {
    subject: `Order Confirmation #${order.id} - ${order.account.name}`,
    text,
    html,
  };
}

function buildShipmentNotificationEmail(order, shipment) {
  const text = `Shipment Update - Order #${order.id}\n\n` +
    `Account: ${order.account.name}\n` +
    `Status: ${shipment.status}\n` +
    (shipment.carrier ? `Carrier: ${shipment.carrier}\n` : '') +
    (shipment.trackingNumber ? `Tracking: ${shipment.trackingNumber}\n` : '') +
    (shipment.estimatedDelivery
      ? `Estimated Delivery: ${new Date(shipment.estimatedDelivery).toLocaleDateString()}\n`
      : '');

  const html = `
    <h2>Shipment Update - Order #${order.id}</h2>
    <p><strong>Account:</strong> ${order.account.name}</p>
    <p><strong>Status:</strong> ${shipment.status}</p>
    ${shipment.carrier ? `<p><strong>Carrier:</strong> ${shipment.carrier}</p>` : ''}
    ${shipment.trackingNumber ? `<p><strong>Tracking:</strong> ${shipment.trackingNumber}</p>` : ''}
    ${shipment.estimatedDelivery
      ? `<p><strong>Estimated Delivery:</strong> ${new Date(shipment.estimatedDelivery).toLocaleDateString()}</p>`
      : ''}
  `;

  return {
    subject: `Shipment Update - Order #${order.id}`,
    text,
    html,
  };
}

function buildAppointmentReminderEmail(appointment) {
  const dateStr = new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeStr = new Date(appointment.scheduledAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  const text = `Appointment Reminder\n\n` +
    `${appointment.title}\n` +
    `Date: ${dateStr} at ${timeStr}\n` +
    (appointment.account ? `Account: ${appointment.account.name}\n` : '') +
    (appointment.account?.address
      ? `Location: ${appointment.account.address}, ${appointment.account.city}\n`
      : '') +
    (appointment.notes ? `Notes: ${appointment.notes}\n` : '');

  return {
    subject: `Reminder: ${appointment.title} - ${dateStr}`,
    text,
    html: text.replace(/\n/g, '<br>'),
  };
}

module.exports = {
  sendEmail,
  buildOrderConfirmationEmail,
  buildShipmentNotificationEmail,
  buildAppointmentReminderEmail,
};
