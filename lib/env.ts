/**
 * Alle sleutels op één plek.
 *
 * Dit bestand wordt alleen server-side geïmporteerd. Next.js zet uitsluitend
 * variabelen met NEXT_PUBLIC_ in de browser-bundel, en die staan hier niet —
 * dus je sleutels blijven op de server.
 */

import { deploymentConfiguratie } from './deployment';

const config = deploymentConfiguratie(process.env);
const s = (v: string | undefined, fallback = '') => (v ?? fallback).trim();
const n = (v: string | undefined, fallback: number) => Number(v ?? fallback) || fallback;

export const env = {
  site: s(config.NEXT_PUBLIC_SITE_URL, 'http://localhost:3000').replace(/\/$/, ''),

  /** Waarmee sessiecookies en OAuth-state worden ondertekend. */
  secret: s(config.BOB_SESSION_SECRET),

  /** Wie er binnen mag. Eén adres is genoeg; meerdere met komma's. */
  toegestaan: s(config.BOB_ALLOWED_EMAILS)
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),

  /** Noodingang als er nog geen mailer staat: één lange geheime code. */
  loginCode: s(config.BOB_LOGIN_CODE),

  xano: {
    /** Bijvoorbeeld https://x8ki-letl-twmt.n7.xano.io */
    instance: s(config.XANO_INSTANCE_URL).replace(/\/$/, ''),
    token: s(config.XANO_METADATA_TOKEN),
    workspace: s(config.XANO_WORKSPACE_ID),
    tabellen: {
      oauth_tokens: s(config.XANO_TABLE_OAUTH_TOKENS),
      berichten: s(config.XANO_TABLE_BERICHTEN),
      instellingen: s(config.XANO_TABLE_INSTELLINGEN),
      bridge_tokens: s(config.XANO_TABLE_BRIDGE_TOKENS),
    },
  },

  mail: {
    resend: s(config.RESEND_API_KEY),
    sendgrid: s(config.SENDGRID_API_KEY),
    van: s(config.BOB_MAIL_FROM, 'BOB <onboarding@resend.dev>'),
  },

  anthropic: {
    key: s(config.ANTHROPIC_API_KEY),
    model: s(config.ANTHROPIC_MODEL, 'claude-sonnet-5'),
    base: s(config.ANTHROPIC_BASE, 'https://api.anthropic.com'),
  },

  cartesia: {
    key: s(config.CARTESIA_API_KEY),
    voice: s(config.CARTESIA_VOICE_ID),
    version: s(config.CARTESIA_VERSION, '2026-08-14'),
    tts: s(config.CARTESIA_TTS_MODEL, 'sonic-3.6'),
    stt: s(config.CARTESIA_STT_MODEL, 'ink-whisper'),
    taal: s(config.CARTESIA_LANGUAGE, 'nl'),
  },

  todoist: { token: s(config.TODOIST_API_TOKEN) },

  google: {
    storage: s(config.BOB_GOOGLE_STORAGE),
    id: s(config.GOOGLE_CLIENT_ID),
    secret: s(config.GOOGLE_CLIENT_SECRET),
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'openid', 'email', 'profile',
    ],
  },

  microsoft: {
    id: s(config.MICROSOFT_CLIENT_ID),
    secret: s(config.MICROSOFT_CLIENT_SECRET),
    tenant: s(config.MICROSOFT_TENANT, 'common'),
    scopes: ['offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read'],
  },

  brave: {
    key: s(config.BRAVE_API_KEY),
    land: s(config.BRAVE_COUNTRY, 'NL'),
    taal: s(config.BRAVE_LANG, 'nl'),
  },

  social: {
    linkedin: s(config.LINKEDIN_ACCESS_TOKEN),
    instagram: s(config.INSTAGRAM_ACCESS_TOKEN),
    facebook: s(config.FACEBOOK_ACCESS_TOKEN),
    tiktok: s(config.TIKTOK_ACCESS_TOKEN),
  },

  sessieDagen: n(config.BOB_SESSION_DAYS, 30),
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
