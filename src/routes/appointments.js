const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/appointmentController');

const router = Router();

router.use(authenticateToken);

router.get('/', ctrl.listAppointments);
router.get('/reminders', ctrl.getReminders);
router.get('/:id', ctrl.getAppointment);
router.post('/', ctrl.createAppointment);
router.put('/:id', ctrl.updateAppointment);

module.exports = router;
