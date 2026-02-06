const { Router } = require('express');
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/pronunciationController');

const router = Router();

router.use(authenticateToken);

// Dictionary CRUD
router.get('/', ctrl.listEntries);
router.get('/:id', ctrl.getEntry);
router.post('/', ctrl.createEntry);
router.put('/:id', ctrl.updateEntry);
router.delete('/:id', ctrl.deleteEntry);

// Voice matching & TTS helpers
router.post('/match', ctrl.matchSpoken);   // POST { text: "shar doh nay" } -> matches
router.post('/ssml', ctrl.getSsml);        // POST { text: "Try the Chardonnay" } -> SSML output

module.exports = router;
