import type { OauthToken } from './tokens';

export function verlopen(iso?: string | null, margeMs = 60_000) {
  const expiry = iso ? Date.parse(iso) : NaN;
  return !Number.isFinite(expiry) || expiry - margeMs <= Date.now();
}

/** Valideer vóór opslag; behoud de bestaande refresh-sleutel bij afwezigheid. */
export function googleToken(payload: unknown, previous: OauthToken = {}): OauthToken {
  const t = payload as Record<string, unknown> | null;
  const seconds = t?.expires_in ?? 3600;
  if (!t || typeof t.access_token !== 'string' || !t.access_token.trim()
    || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0
    || seconds > 31_536_000
    || (t.refresh_token != null && (typeof t.refresh_token !== 'string' || !t.refresh_token.trim()))
    || (t.scope != null && typeof t.scope !== 'string')) {
    throw new Error('Google gaf een ongeldig tokenantwoord terug. Koppel zo nodig opnieuw.');
  }
  return {
    ...previous,
    access_token: t.access_token,
    refresh_token: (t.refresh_token as string | undefined) ?? previous.refresh_token,
    scope: (t.scope as string | undefined) ?? previous.scope,
    expires_at: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}
