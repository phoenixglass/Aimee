const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

const router = Router();

router.use(authenticateToken);

router.get('/', ctrl.listOrders);
router.get('/:id', ctrl.getOrder);
router.post('/', ctrl.createOrder);
router.post('/:id/confirm', ctrl.confirmOrder);
router.put('/:id/status', ctrl.updateStatus);
router.post('/:id/cancel', ctrl.cancelOrder);

module.exports = router;
