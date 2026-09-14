import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { opslagOmgeving } from './deployment';
import { openZegel, verzegel } from './account-crypto';

export type ChatBericht = { rol: 'user' | 'assistant'; inhoud: string };
export const chatContext = (environment: string, owner: string, subject: string, id: string) =>
  JSON.stringify(['chat-v1', environment, owner, subject, id]);

/** Eén versleutelde rij per volledige beurt: vraag en antwoord worden samen opgeslagen. */
export function chatStore(owner: string, subject: string) {
  const key = process.env.BOB_ACCOUNT_ENCRYPTION_KEY || '';
  if (!owner || !subject || !process.env.DATABASE_URL || !/^[a-f0-9]{64}$/i.test(key)) {
    throw Object.assign(new Error('Chatopslag is nog niet beschikbaar.'), { status: 503 });
  }
  const environment = JSON.stringify([process.env.VERCEL_PROJECT_ID || 'bob', opslagOmgeving(process.env) || 'production']);
  const sql = neon(process.env.DATABASE_URL);
  const options = () => ({ fetchOptions: { cache: 'no-store' as const, signal: AbortSignal.timeout(15_000) } });
  return {
    async list(): Promise<ChatBericht[]> {
      const rows = await sql.query(
        'SELECT id, ciphertext FROM bob_chat_turns WHERE environment=$1 AND owner_id=$2 AND google_subject=$3 ORDER BY created_at DESC, id DESC LIMIT 25',
        [environment, owner, subject], options());
      return rows.reverse().flatMap(row => openZegel<ChatBericht[]>(String(row.ciphertext), key, chatContext(environment, owner, subject, String(row.id))));
    },
    async save(question: string, answer: string) {
      const id = randomUUID();
      const messages: ChatBericht[] = [{ rol: 'user', inhoud: question }, { rol: 'assistant', inhoud: answer }];
      const ciphertext = verzegel(messages, key, chatContext(environment, owner, subject, id));
      await sql.query('INSERT INTO bob_chat_turns (id,environment,owner_id,google_subject,ciphertext) VALUES ($1,$2,$3,$4,$5)',
        [id, environment, owner, subject, ciphertext], options());
    },
  };
}
