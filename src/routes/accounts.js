const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/accountController');

const router = Router();

router.use(authenticateToken);

router.get('/', ctrl.listAccounts);
router.get('/:id', ctrl.getAccount);
router.post('/', ctrl.createAccount);
router.put('/:id', ctrl.updateAccount);

module.exports = router;
