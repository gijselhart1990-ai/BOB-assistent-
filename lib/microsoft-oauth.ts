import { createHash, randomBytes } from 'node:crypto';
import { openZegel, verzegel } from './account-crypto';

export const microsoftOAuthCookie = 'bob-microsoft-oauth';
type Aanmelding = { owner: string; context: string; state: string; verifier: string; expires: number };
const key = (secret: string) => {
  if (secret.length < 32) throw new Error('Sessiesleutel ontbreekt.');
  return createHash('sha256').update(`microsoft-oauth:${secret}`).digest('hex');
};
export function maakMicrosoftAanmelding(owner: string, context: string, secret: string) {
  const data: Aanmelding = { owner, context, state: randomBytes(32).toString('base64url'),
    verifier: randomBytes(32).toString('base64url'), expires: Date.now() + 600_000 };
  return { state: data.state, challenge: createHash('sha256').update(data.verifier).digest('base64url'),
    cookie: verzegel(data, key(secret), 'microsoft-oauth-v1') };
}
export function leesMicrosoftAanmelding(cookie: string, state: string, owner: string, context: string, secret: string) {
  const data = openZegel<Aanmelding>(cookie, key(secret), 'microsoft-oauth-v1');
  if (!state || data.state !== state || data.owner !== owner || !context || data.context !== context
    || !Number.isSafeInteger(data.expires) || data.expires <= Date.now()
    || !/^[A-Za-z0-9_-]{43}$/.test(data.verifier)) throw new Error('Ongeldige of verlopen Outlook-aanmelding.');
  return data;
}
