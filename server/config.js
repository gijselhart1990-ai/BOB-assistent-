import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const PUBLIC_DIR = path.join(ROOT, 'public');

const bool = (v, fallback = false) => {
  if (v === undefined || v === null || v === '') return fallback;
  return ['1', 'true', 'yes', 'ja', 'on'].includes(String(v).toLowerCase());
};

export const config = {
  demo: bool(process.env.BOB_DEMO, false),
  port: Number(process.env.PORT || 4321),
  name: process.env.BOB_NAME || 'BOB',
  user: process.env.BOB_USER || 'Sander',
  locale: process.env.BOB_LOCALE || 'nl-NL',
  timezone: process.env.BOB_TIMEZONE || 'Europe/Berlin',

  cartesia: {
    apiKey: process.env.CARTESIA_API_KEY || '',
    voiceId: process.env.CARTESIA_VOICE_ID || '',
    version: process.env.CARTESIA_VERSION || '2026-08-14',
    ttsModel: process.env.CARTESIA_TTS_MODEL || 'sonic-3.6',
    sttModel: process.env.CARTESIA_STT_MODEL || 'ink-whisper',
    language: process.env.CARTESIA_LANGUAGE || 'nl',
    base: 'https://api.cartesia.ai',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    base: 'https://api.anthropic.com',
  },

  todoist: {
    token: process.env.TODOIST_API_TOKEN || '',
  },

  xano: {
    // ms6t-jyw is de gedeelde aanmeldlink. De API-basis-URL komt uit de
    // API-groep in de Xano-workspace (bijvoorbeeld .../api:abc123).
    signupUrl: 'https://xano.io/ms6t-jyw',
    apiBaseUrl: process.env.XANO_API_BASE_URL || '',
    authToken: process.env.XANO_AUTH_TOKEN || '',
    stateEndpoint: process.env.XANO_STATE_ENDPOINT || 'bob_state',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'openid',
      'email',
      'profile',
    ],
  },

  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    tenant: process.env.MICROSOFT_TENANT || 'common',
    scopes: [
      'offline_access',
      'User.Read',
      'Mail.Read',
      'Calendars.Read',
    ],
  },

  whatsapp: {
    enabled: bool(process.env.WHATSAPP_ENABLED, false),
  },

  social: {
    linkedin: process.env.LINKEDIN_ACCESS_TOKEN || '',
    instagram: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    facebook: process.env.FACEBOOK_ACCESS_TOKEN || '',
    tiktok: process.env.TIKTOK_ACCESS_TOKEN || '',
  },

  // Autopilot voert alleen lokale, omkeerbare opdrachten automatisch uit
  // (onderzoek, samenvatten, onthouden). Een externe wijziging moet óf
  // expliciet in de opdracht staan, óf via een connector met een eigen
  // bevestigingsstap gaan.
  agent: {
    autopilot: bool(process.env.BOB_AUTOPILOT, true),
    maxJobs: Math.max(5, Math.min(Number(process.env.BOB_MAX_JOBS || 80), 250)),
  },
};

export const redirectUri = (provider) =>
  `http://localhost:${config.port}/oauth/${provider}/callback`;

/** Wat is er wel/niet ingesteld — het dashboard toont dit als statuslampjes. */
export function capabilities() {
  return {
    voice: Boolean(config.cartesia.apiKey && config.cartesia.voiceId),
    brain: Boolean(config.anthropic.apiKey),
    todoist: Boolean(config.todoist.token),
    xano: Boolean(config.xano.apiBaseUrl),
    google: Boolean(config.google.clientId && config.google.clientSecret),
    // Alleen de client-ID is verplicht: bij de device code flow bestaat er
    // geen secret. Die eisen zou die hele route onbruikbaar maken.
    microsoft: Boolean(config.microsoft.clientId),
    whatsapp: config.whatsapp.enabled,
    social: Boolean(
      config.social.linkedin || config.social.instagram ||
      config.social.facebook || config.social.tiktok
    ),
  };
}
