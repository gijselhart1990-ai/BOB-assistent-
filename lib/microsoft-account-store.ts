import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { opslagOmgeving } from './deployment';
import { openZegel, verzegel } from './account-crypto';
import type { OauthToken } from './tokens';

export type MicrosoftAccount = {
  tenant: string; subject: string; email: string; token: OauthToken; version: string;
};

export function microsoftAccountStore(owner: string, context: string) {
  const url = process.env.DATABASE_URL;
  const key = process.env.BOB_ACCOUNT_ENCRYPTION_KEY || '';
  const environment = JSON.stringify([process.env.VERCEL_PROJECT_ID || 'bob', opslagOmgeving(process.env) || 'production']);
  if (!owner || !context || !url || !/^[a-f0-9]{64}$/i.test(key)) {
    throw new Error('De beveiligde Outlook-opslag is nog niet ingesteld.');
  }
  const sql = neon(url, { fetchOptions: { cache: 'no-store', signal: AbortSignal.timeout(15_000) } });
  const aad = (tenant: string, subject: string) => JSON.stringify(['microsoft-v1', environment, owner, context, tenant, subject]);
  return {
    async read(): Promise<MicrosoftAccount | null> {
      const rows = await sql`SELECT tenant_id,microsoft_subject,email,token_ciphertext,version FROM bob_microsoft_accounts
        WHERE environment=${environment} AND owner_id=${owner} AND google_subject=${context}`;
      if (!rows.length) return null;
      const row = rows[0];
      return { tenant: row.tenant_id, subject: row.microsoft_subject, email: row.email, version: row.version,
        token: openZegel<OauthToken>(row.token_ciphertext, key, aad(row.tenant_id, row.microsoft_subject)) };
    },
    async save(account: Omit<MicrosoftAccount, 'version'>, previousVersion?: string) {
      if (!account.subject || !account.tenant || !account.email || !account.token.access_token || !account.token.refresh_token) {
        throw new Error('Onvolledige Outlook-koppeling. Koppel opnieuw.');
      }
      const encrypted = verzegel(account.token, key, aad(account.tenant, account.subject));
      const version = randomUUID();
      if (previousVersion) {
        const rows = await sql`UPDATE bob_microsoft_accounts SET token_ciphertext=${encrypted},version=${version},updated_at=now()
          WHERE environment=${environment} AND owner_id=${owner} AND google_subject=${context}
          AND tenant_id=${account.tenant} AND microsoft_subject=${account.subject} AND version=${previousVersion} RETURNING version`;
        return rows.length > 0;
      }
      await sql`INSERT INTO bob_microsoft_accounts (environment,owner_id,google_subject,tenant_id,microsoft_subject,email,token_ciphertext,version)
        VALUES (${environment},${owner},${context},${account.tenant},${account.subject},${account.email},${encrypted},${version})
        ON CONFLICT (environment,owner_id,google_subject) DO UPDATE SET
        tenant_id=EXCLUDED.tenant_id,microsoft_subject=EXCLUDED.microsoft_subject,email=EXCLUDED.email,
        token_ciphertext=EXCLUDED.token_ciphertext,version=EXCLUDED.version,updated_at=now()`;
      return true;
    },
  };
}
