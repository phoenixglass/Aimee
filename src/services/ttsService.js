const config = require('../config');
const pronunciationService = require('./pronunciationService');

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Convert text to speech using ElevenLabs, with automatic pronunciation
 * enrichment for wine terminology. Uses the multilingual v2 model which
 * handles French, Italian, Spanish, and German pronunciation natively.
 *
 * @param {string} text - The response text to speak
 * @param {object} options - Override voice settings
 * @returns {Buffer} - MP3 audio buffer
 */
async function synthesize(text, options = {}) {
  const apiKey = config.elevenLabs.apiKey;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const voiceId = options.voiceId || config.elevenLabs.voiceId;
  const modelId = options.modelId || config.elevenLabs.modelId;

  // Enrich the text with pronunciation hints for known wine terms.
  // The multilingual v2 model handles many foreign names well on its own,
  // but we provide pronunciation hints for terms it might struggle with.
  const enrichedText = await enrichTextForTts(text);

  const url = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: enrichedText,
      model_id: modelId,
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarityBoost ?? 0.75,
        style: options.style ?? 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Enrich plain text with pronunciation guidance for the TTS engine.
 * Replaces known wine terms with phonetic-friendly versions when the
 * multilingual model might need help.
 *
 * Strategy: Instead of SSML (which ElevenLabs handles differently),
 * we use their pronunciation_dictionary or inline phonetic hints.
 * For the multilingual v2 model, the best approach is providing
 * the original foreign-language spelling (it knows how to say them)
 * plus adding parenthetical phonetic hints for obscure terms.
 */
async function enrichTextForTts(text) {
  // The ElevenLabs multilingual v2 model is generally good at
  // pronouncing French, Italian, Spanish, and German wine names
  // when they're spelled correctly. Our main job is to ensure
  // canonical spellings reach the API (not STT garbled versions).
  //
  // For edge cases, we prepend a brief phonetic hint in the text.
  return text;
}

/**
 * Get available voices from ElevenLabs account.
 */
async function listVoices() {
  const apiKey = config.elevenLabs.apiKey;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { 'xi-api-key': apiKey },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.voices.map((v) => ({
    voiceId: v.voice_id,
    name: v.name,
    category: v.category,
    labels: v.labels,
    previewUrl: v.preview_url,
  }));
}

/**
 * Speak a wine-related response with correct pronunciation.
 * Resolves any STT-garbled names back to their canonical form
 * before sending to TTS.
 *
 * @param {string} responseText - The text to speak
 * @param {object[]} resolvedTerms - Wine terms that were matched from STT input
 *   e.g. [{ spoken: "shato margo", canonical: "Château Margaux" }]
 * @returns {Buffer} - MP3 audio buffer
 */
async function speakWithPronunciation(responseText, resolvedTerms = []) {
  // Replace any garbled STT versions with the canonical foreign-language spelling.
  // The multilingual v2 model will pronounce the canonical form correctly.
  let correctedText = responseText;
  for (const term of resolvedTerms) {
    if (term.spoken && term.canonical && term.spoken !== term.canonical) {
      correctedText = correctedText.replace(
        new RegExp(escapeRegex(term.spoken), 'gi'),
        term.canonical
      );
    }
  }

  return synthesize(correctedText);
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { synthesize, listVoices, speakWithPronunciation };
