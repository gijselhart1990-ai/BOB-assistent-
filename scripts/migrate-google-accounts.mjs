import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ontbreekt.');
if (process.env.VERCEL_ENV !== 'preview') throw new Error('Deze migratie is uitsluitend voor Preview.');
const source = await readFile(new URL('../migrations/001_google_accounts.sql', import.meta.url), 'utf8');
const statements = source.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(s => s && s !== 'BEGIN' && s !== 'COMMIT');
const sql = neon(process.env.DATABASE_URL);
try {
  await sql.transaction(statements.map(statement => sql.query(statement)), { fetchOptions: { signal: AbortSignal.timeout(30_000) } });
  console.log('Google-accounttabellen zijn voorbereid.');
} catch {
  console.error('Migratie mislukt. Controleer de databaseverbinding en tabeldefinities.');
  process.exitCode = 1;
}
