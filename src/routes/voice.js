const { Router } = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/voiceController');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max audio file
});

router.use(authenticateToken);

// Full voice conversation (audio in, JSON + audio out)
router.post('/converse', upload.single('audio'), ctrl.converse);

// Voice conversation returning raw audio (audio in, audio out)
router.post('/converse-audio', upload.single('audio'), ctrl.converseAudio);

// Text-based conversation (for testing or text fallback)
router.post('/text', ctrl.textConverse);

// Pure TTS synthesis
router.post('/synthesize', ctrl.synthesize);

// List available TTS voices
router.get('/voices', ctrl.listVoices);

module.exports = router;
