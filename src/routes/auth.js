const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = Router();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', authenticateToken, ctrl.getProfile);

module.exports = router;
