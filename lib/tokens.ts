import { eersteOfNull, zetNeer } from '@/lib/xano';

export type OauthToken = {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: string | null;
  scope?: string | null;
  public_client?: boolean;
};

/**
 * OAuth-tokens staan in Xano, en alleen de server komt erbij. Ze staan
 * bewust niet in Netlify Blobs: dit zijn de sleutels tot je mail en agenda,
 * en die horen in een database die je kunt inzien en opschonen.
 */
export async function leesToken(email: string, provider: 'google' | 'microsoft'): Promise<OauthToken | null> {
  return eersteOfNull<OauthToken>('oauth_tokens', { gebruiker: email, provider });
}

export async function schrijfToken(email: string, provider: 'google' | 'microsoft', t: OauthToken) {
  await zetNeer('oauth_tokens', { gebruiker: email, provider }, {
    access_token: t.access_token ?? null,
    refresh_token: t.refresh_token ?? null,
    expires_at: t.expires_at ?? null,
    scope: t.scope ?? null,
    public_client: t.public_client ?? false,
    bijgewerkt: new Date().toISOString(),
  });
}

export const verlopen = (iso?: string | null, margeMs = 60_000) =>
  !iso || new Date(iso).getTime() - margeMs < Date.now();
