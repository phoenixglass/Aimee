const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const { ValidationError } = require('../utils/errors');

/**
 * POST /api/messages/send
 * Send a quick email or SMS to an account.
 * Body: { channel: "sms"|"email", accountName: "Thompson Restaurant", message: "Your Barolo is in!" }
 */
async function sendMessage(req, res, next) {
  try {
    const { channel, accountId, accountName, message } = req.body;
    if (!channel || !message) {
      throw new ValidationError('channel and message are required');
    }
    if (!accountId && !accountName) {
      throw new ValidationError('accountId or accountName is required');
    }

    const result = await notificationService.sendQuickMessage({
      channel,
      accountId,
      accountName,
      message,
      userId: req.user.id,
    });

    res.json(result);
  } catch (err) { next(err); }
}

/**
 * POST /api/messages/notify/order/:id
 * Send order confirmation notifications to the account.
 */
async function notifyOrder(req, res, next) {
  try {
    const result = await notificationService.notifyOrderConfirmed(
      Number(req.params.id),
      req.user.id
    );
    res.json(result);
  } catch (err) { next(err); }
}

/**
 * POST /api/messages/notify/shipment/:orderId
 * Send shipment update notifications.
 */
async function notifyShipment(req, res, next) {
  try {
    const result = await notificationService.notifyShipmentUpdate(
      Number(req.params.orderId),
      req.user.id
    );
    res.json(result);
  } catch (err) { next(err); }
}

/**
 * POST /api/messages/notify/appointment/:id
 * Send appointment reminder.
 */
async function notifyAppointment(req, res, next) {
  try {
    const result = await notificationService.notifyAppointmentReminder(
      Number(req.params.id),
      req.user.id
    );
    res.json(result);
  } catch (err) { next(err); }
}

/**
 * GET /api/messages/history
 * Get message history. Query params: channel, relatedType, limit
 */
async function getHistory(req, res, next) {
  try {
    const messages = await notificationService.getMessageHistory({
      userId: req.user.role === 'admin' ? undefined : req.user.id,
      channel: req.query.channel,
      relatedType: req.query.relatedType,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json(messages);
  } catch (err) { next(err); }
}

module.exports = { sendMessage, notifyOrder, notifyShipment, notifyAppointment, getHistory };
