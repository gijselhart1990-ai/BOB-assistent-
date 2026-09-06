/**
 * Alle sleutels op één plek.
 *
 * Dit bestand wordt alleen server-side geïmporteerd. Next.js zet uitsluitend
 * variabelen met NEXT_PUBLIC_ in de browser-bundel, en die staan hier niet —
 * dus je sleutels blijven op de server.
 */

const s = (v: string | undefined, fallback = '') => (v ?? fallback).trim();
const n = (v: string | undefined, fallback: number) => Number(v ?? fallback) || fallback;

export const env = {
  site: s(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3000').replace(/\/$/, ''),

  /** Waarmee sessiecookies en OAuth-state worden ondertekend. */
  secret: s(process.env.BOB_SESSION_SECRET),

  /** Wie er binnen mag. Eén adres is genoeg; meerdere met komma's. */
  toegestaan: s(process.env.BOB_ALLOWED_EMAILS)
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),

  /** Noodingang als er nog geen mailer staat: één lange geheime code. */
  loginCode: s(process.env.BOB_LOGIN_CODE),

  xano: {
    /** Bijvoorbeeld https://x8ki-letl-twmt.n7.xano.io */
    instance: s(process.env.XANO_INSTANCE_URL).replace(/\/$/, ''),
    token: s(process.env.XANO_METADATA_TOKEN),
    workspace: s(process.env.XANO_WORKSPACE_ID),
    tabellen: {
      oauth_tokens: s(process.env.XANO_TABLE_OAUTH_TOKENS),
      berichten: s(process.env.XANO_TABLE_BERICHTEN),
      instellingen: s(process.env.XANO_TABLE_INSTELLINGEN),
      bridge_tokens: s(process.env.XANO_TABLE_BRIDGE_TOKENS),
    },
  },

  mail: {
    resend: s(process.env.RESEND_API_KEY),
    sendgrid: s(process.env.SENDGRID_API_KEY),
    van: s(process.env.BOB_MAIL_FROM, 'BOB <onboarding@resend.dev>'),
  },

  anthropic: {
    key: s(process.env.ANTHROPIC_API_KEY),
    model: s(process.env.ANTHROPIC_MODEL, 'claude-sonnet-5'),
    base: s(process.env.ANTHROPIC_BASE, 'https://api.anthropic.com'),
  },

  cartesia: {
    key: s(process.env.CARTESIA_API_KEY),
    voice: s(process.env.CARTESIA_VOICE_ID),
    version: s(process.env.CARTESIA_VERSION, '2026-08-14'),
    tts: s(process.env.CARTESIA_TTS_MODEL, 'sonic-3.6'),
    stt: s(process.env.CARTESIA_STT_MODEL, 'ink-whisper'),
    taal: s(process.env.CARTESIA_LANGUAGE, 'nl'),
  },

  todoist: { token: s(process.env.TODOIST_API_TOKEN) },

  google: {
    id: s(process.env.GOOGLE_CLIENT_ID),
    secret: s(process.env.GOOGLE_CLIENT_SECRET),
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'openid', 'email', 'profile',
    ],
  },

  microsoft: {
    id: s(process.env.MICROSOFT_CLIENT_ID),
    secret: s(process.env.MICROSOFT_CLIENT_SECRET),
    tenant: s(process.env.MICROSOFT_TENANT, 'common'),
    scopes: ['offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read'],
  },

  brave: {
    key: s(process.env.BRAVE_API_KEY),
    land: s(process.env.BRAVE_COUNTRY, 'NL'),
    taal: s(process.env.BRAVE_LANG, 'nl'),
  },

  social: {
    linkedin: s(process.env.LINKEDIN_ACCESS_TOKEN),
    instagram: s(process.env.INSTAGRAM_ACCESS_TOKEN),
    facebook: s(process.env.FACEBOOK_ACCESS_TOKEN),
    tiktok: s(process.env.TIKTOK_ACCESS_TOKEN),
  },

  sessieDagen: n(process.env.BOB_SESSION_DAYS, 30),
};

export const redirectUri = (provider: 'google' | 'microsoft') =>
  `${env.site}/api/oauth/${provider}/callback`;

export function capabilities() {
  return {
    brein: Boolean(env.anthropic.key),
    stem: Boolean(env.cartesia.key && env.cartesia.voice),
    todoist: Boolean(env.todoist.token),
    google: Boolean(env.google.id && env.google.secret),
    microsoft: Boolean(env.microsoft.id),
    web: Boolean(env.brave.key),
    social: Boolean(env.social.linkedin || env.social.instagram || env.social.facebook || env.social.tiktok),
    xano: Boolean(env.xano.instance && env.xano.token && env.xano.workspace),
    mail: Boolean(env.mail.resend || env.mail.sendgrid),
  };
}
