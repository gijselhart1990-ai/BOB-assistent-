import { neon } from '@neondatabase/serverless';
import { opslagOmgeving } from './deployment';
import { openZegel, verzegel } from './account-crypto';
import type { OauthToken } from './tokens';

export type GoogleAccount = { subject: string; email: string; selected: boolean };

/** Alle queries zijn begrensd op omgeving en ingelogde BOB-eigenaar. */
export function googleAccountStore(owner: string) {
  const url = process.env.DATABASE_URL;
  const key = process.env.BOB_ACCOUNT_ENCRYPTION_KEY || '';
  const environment = JSON.stringify([process.env.VERCEL_PROJECT_ID || 'bob', opslagOmgeving(process.env) || 'production']);
  if (!owner || !url || !/^[a-f0-9]{64}$/i.test(key)) {
    throw Object.assign(new Error('De opslag voor Google-accounts is nog niet ingesteld.'), { status: 503 });
  }
  const sql = neon(url, { fetchOptions: { cache: 'no-store', signal: AbortSignal.timeout(15_000) } });
  const context = (subject: string, field: string) => JSON.stringify([environment, owner, subject, field]);
  return {
    async list(): Promise<GoogleAccount[]> {
      const rows = await sql`SELECT a.google_subject, a.email, (s.google_subject IS NOT NULL) AS selected
        FROM bob_google_accounts a LEFT JOIN bob_google_selection s
        ON s.environment=a.environment AND s.owner_id=a.owner_id AND s.google_subject=a.google_subject
        WHERE a.environment=${environment} AND a.owner_id=${owner} ORDER BY a.created_at, a.google_subject`;
      return rows.map(row => ({ subject: String(row.google_subject), email: String(row.email), selected: Boolean(row.selected) }));
    },
    async read(subject: string): Promise<OauthToken | null> {
      const rows = await sql`SELECT token_ciphertext, refresh_ciphertext FROM bob_google_accounts
        WHERE environment=${environment} AND owner_id=${owner} AND google_subject=${subject}`;
      if (!rows.length) return null;
      const token = openZegel<OauthToken>(rows[0].token_ciphertext, key, context(subject, 'access'));
      if (rows[0].refresh_ciphertext) token.refresh_token = openZegel<string>(rows[0].refresh_ciphertext, key, context(subject, 'refresh'));
      return token;
    },
    async save(subject: string, email: string, token: OauthToken) {
      if (!subject || !email || !token.access_token) throw new Error('Onvolledig Google-account.');
      const { refresh_token, ...rest } = token;
      const encrypted = verzegel(rest, key, context(subject, 'access'));
      const refresh = refresh_token ? verzegel(refresh_token, key, context(subject, 'refresh')) : null;
      await sql.transaction([
        sql`INSERT INTO bob_google_accounts (environment,owner_id,google_subject,email,token_ciphertext,refresh_ciphertext)
          VALUES (${environment},${owner},${subject},${email},${encrypted},${refresh})
          ON CONFLICT (environment,owner_id,google_subject) DO UPDATE SET
          email=EXCLUDED.email,token_ciphertext=EXCLUDED.token_ciphertext,
          refresh_ciphertext=COALESCE(EXCLUDED.refresh_ciphertext,bob_google_accounts.refresh_ciphertext),updated_at=now()`,
        sql`INSERT INTO bob_google_selection (environment,owner_id,google_subject)
          VALUES (${environment},${owner},${subject}) ON CONFLICT (environment,owner_id) DO NOTHING`,
      ]);
    },
    async select(subject: string) {
      const rows = await sql`INSERT INTO bob_google_selection (environment,owner_id,google_subject)
        SELECT environment,owner_id,google_subject FROM bob_google_accounts
        WHERE environment=${environment} AND owner_id=${owner} AND google_subject=${subject}
        ON CONFLICT (environment,owner_id) DO UPDATE SET google_subject=EXCLUDED.google_subject,updated_at=now()
        RETURNING google_subject`;
      if (!rows.length) throw Object.assign(new Error('Google-account niet gevonden.'), { status: 404 });
    },
    async remove(subject: string) {
      await sql`DELETE FROM bob_google_accounts WHERE environment=${environment} AND owner_id=${owner} AND google_subject=${subject}`;
    },
  };
}
