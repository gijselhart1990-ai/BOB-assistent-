import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function sleutel(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('Accountopslag vereist een aparte sleutel van 64 hextekens.');
  return Buffer.from(value, 'hex');
}

/** Koppelt de ciphertext aan omgeving, eigenaar en Google-identiteit. */
export function verzegel(value: unknown, key: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sleutel(key), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function openZegel<T>(value: string, key: string, context: string): T {
  const [version, iv, tag, data, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !data || extra !== undefined) throw new Error('Ongeldig opgeslagen accounttoken.');
  const cipher = createDecipheriv('aes-256-gcm', sleutel(key), Buffer.from(iv, 'base64url'));
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString('utf8')) as T;
}
