const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/wineController');

const router = Router();

router.use(authenticateToken);

router.get('/', ctrl.listWines);
router.get('/:id', ctrl.getWine);
router.post('/', ctrl.createWine);
router.put('/:id', ctrl.updateWine);
router.delete('/:id', ctrl.deleteWine);

// Inventory sub-routes
router.get('/:id/inventory', ctrl.getInventory);
router.put('/:id/inventory', ctrl.updateInventory);

module.exports = router;
