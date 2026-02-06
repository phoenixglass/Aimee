const voiceService = require('../services/voiceService');
const ttsService = require('../services/ttsService');
const { ValidationError } = require('../utils/errors');

/**
 * POST /api/voice/converse
 * Full voice conversation: accepts audio, returns audio + metadata.
 * Content-Type: multipart/form-data with an "audio" file field.
 */
async function converse(req, res, next) {
  try {
    if (!req.file) {
      throw new ValidationError('Audio file is required. Send as multipart/form-data with field name "audio".');
    }

    const result = await voiceService.processVoiceInput(
      req.file.buffer,
      req.file.mimetype,
      req.user
    );

    // Return JSON metadata + base64-encoded audio
    res.json({
      transcript: result.transcript,
      intent: result.intent,
      responseText: result.responseText,
      resolvedTerms: result.resolvedTerms,
      audio: result.audio ? result.audio.toString('base64') : null,
      audioMimeType: 'audio/mpeg',
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/voice/converse-audio
 * Same as converse but returns raw audio (for direct playback).
 * Metadata is in response headers.
 */
async function converseAudio(req, res, next) {
  try {
    if (!req.file) {
      throw new ValidationError('Audio file is required.');
    }

    const result = await voiceService.processVoiceInput(
      req.file.buffer,
      req.file.mimetype,
      req.user
    );

    if (!result.audio) {
      return res.status(500).json({ error: 'TTS failed to generate audio' });
    }

    // Put metadata in headers so the client can access it
    res.set('X-Transcript', encodeURIComponent(result.transcript));
    res.set('X-Response-Text', encodeURIComponent(result.responseText));
    res.set('X-Intent', encodeURIComponent(JSON.stringify(result.intent)));
    res.set('Content-Type', 'audio/mpeg');
    res.send(result.audio);
  } catch (err) { next(err); }
}

/**
 * POST /api/voice/text
 * Text-based conversation (no audio input). Returns text + optional audio.
 * Body: { "text": "order 3 cases of Tignanello for Le Petit Bistro" }
 */
async function textConverse(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) {
      throw new ValidationError('Text field is required');
    }

    const result = await voiceService.processTextInput(text, req.user);

    res.json({
      transcript: result.transcript,
      intent: result.intent,
      responseText: result.responseText,
      resolvedTerms: result.resolvedTerms,
      audio: result.audio ? result.audio.toString('base64') : null,
      audioMimeType: result.audio ? 'audio/mpeg' : null,
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/voice/synthesize
 * Pure TTS: send text, get audio back.
 * Body: { "text": "...", "voiceId": "optional" }
 */
async function synthesize(req, res, next) {
  try {
    const { text, voiceId } = req.body;
    if (!text) {
      throw new ValidationError('Text field is required');
    }

    const audio = await ttsService.synthesize(text, { voiceId });
    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err) { next(err); }
}

/**
 * GET /api/voice/voices
 * List available ElevenLabs voices.
 */
async function listVoices(req, res, next) {
  try {
    const voices = await ttsService.listVoices();
    res.json(voices);
  } catch (err) { next(err); }
}

module.exports = { converse, converseAudio, textConverse, synthesize, listVoices };
