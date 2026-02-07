require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this',
    expiry: process.env.JWT_EXPIRY || '24h',
  },
  // Voice - ElevenLabs TTS
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Rachel (default)
    modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
  },
  // Voice - STT
  sttProvider: process.env.STT_PROVIDER || 'deepgram', // "deepgram" or "whisper"
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@aimee.app',
  },
};

module.exports = config;
