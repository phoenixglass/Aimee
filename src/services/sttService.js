const config = require('../config');

/**
 * Transcribe audio to text using the configured STT provider.
 *
 * @param {Buffer} audioBuffer - Raw audio data (webm, wav, mp3, etc.)
 * @param {string} mimeType - The MIME type of the audio (e.g. "audio/webm")
 * @returns {object} - { transcript, confidence, words }
 */
async function transcribe(audioBuffer, mimeType = 'audio/webm') {
  const provider = config.sttProvider;

  if (provider === 'deepgram') {
    return transcribeWithDeepgram(audioBuffer, mimeType);
  } else if (provider === 'whisper') {
    return transcribeWithWhisper(audioBuffer, mimeType);
  } else {
    throw new Error(`Unknown STT provider: ${provider}. Use "deepgram" or "whisper".`);
  }
}

// ─── DEEPGRAM ────────────────────────────────────────────────

async function transcribeWithDeepgram(audioBuffer, mimeType) {
  const apiKey = config.deepgram.apiKey;
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY is not configured');
  }

  // Deepgram Nova-2 model with features optimized for wine terminology:
  // - smart_format: punctuation and formatting
  // - punctuate: add punctuation
  // - keywords: boost recognition of common wine terms
  const params = new URLSearchParams({
    model: 'nova-2',
    smart_format: 'true',
    punctuate: 'true',
    language: 'en',
    // Boost wine-specific keywords that STT often garbles
    keywords: [
      'Pinot Noir', 'Cabernet Sauvignon', 'Chardonnay', 'Merlot', 'Syrah',
      'Sangiovese', 'Nebbiolo', 'Tempranillo', 'Riesling', 'Gewürztraminer',
      'Bordeaux', 'Bourgogne', 'Champagne', 'Toscana', 'Piemonte', 'Rioja',
      'Châteauneuf-du-Pape', 'Barolo', 'Brunello', 'Tignanello',
      'Sauvignon Blanc', 'Malbec', 'Viognier', 'Grüner Veltliner',
      'cuvée', 'brut', 'terroir', 'sommelier', 'appellation',
      'reserva', 'riserva', 'spätlese', 'grand cru',
    ].join(':5,') + ':5', // boost factor of 5
  });

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': mimeType,
      },
      body: audioBuffer,
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Deepgram API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const result = data.results?.channels?.[0]?.alternatives?.[0];

  return {
    transcript: result?.transcript || '',
    confidence: result?.confidence || 0,
    words: result?.words || [],
    raw: data,
  };
}

// ─── OPENAI WHISPER ──────────────────────────────────────────

async function transcribeWithWhisper(audioBuffer, mimeType) {
  const apiKey = config.openai.apiKey;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Whisper expects multipart form data
  const ext = mimeTypeToExt(mimeType);
  const blob = new Blob([audioBuffer], { type: mimeType });

  const formData = new FormData();
  formData.append('file', blob, `audio.${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  // Prompt with wine terminology to improve recognition accuracy
  formData.append('prompt',
    'Wine sales conversation. Terms include: Pinot Noir, Cabernet Sauvignon, ' +
    'Chardonnay, Merlot, Syrah, Sangiovese, Nebbiolo, Tempranillo, Riesling, ' +
    'Gewürztraminer, Bordeaux, Bourgogne, Châteauneuf-du-Pape, Toscana, ' +
    'Piemonte, Rioja, Barolo, Tignanello, Sauvignon Blanc, Viognier, ' +
    'Grüner Veltliner, cuvée, brut, terroir, sommelier, appellation, ' +
    'reserva, riserva, spätlese, grand cru, mise en bouteille.'
  );

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI Whisper API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  return {
    transcript: data.text || '',
    confidence: null, // Whisper doesn't return confidence scores
    words: [],
    raw: data,
  };
}

function mimeTypeToExt(mimeType) {
  const map = {
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'mp4',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
  };
  return map[mimeType] || 'webm';
}

module.exports = { transcribe };
