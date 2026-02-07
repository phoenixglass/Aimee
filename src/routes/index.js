const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth'));
router.use('/wines', require('./wines'));
router.use('/accounts', require('./accounts'));
router.use('/orders', require('./orders'));
router.use('/appointments', require('./appointments'));
router.use('/pronunciation', require('./pronunciation'));
router.use('/voice', require('./voice'));
router.use('/messages', require('./messages'));

module.exports = router;
