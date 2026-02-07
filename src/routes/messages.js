const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/messageController');

const router = Router();

router.use(authenticateToken);

// Send a quick message to an account
router.post('/send', ctrl.sendMessage);

// Trigger notifications for specific events
router.post('/notify/order/:id', ctrl.notifyOrder);
router.post('/notify/shipment/:orderId', ctrl.notifyShipment);
router.post('/notify/appointment/:id', ctrl.notifyAppointment);

// Message history
router.get('/history', ctrl.getHistory);

module.exports = router;
