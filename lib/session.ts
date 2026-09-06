import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

/**
 * Sessies en inloglinks, zonder externe dienst.
 *
 * Supabase deed dit eerder; nu Xano alleen nog database is, doen we het zelf.
 * Dat is hier verantwoord omdat het om één gebruiker gaat en er geen
 * wachtwoorden bestaan: je krijgt een link in je mail, die link is één keer
 * te gebruiken en tien minuten geldig, en daarna zit er een ondertekend
 * cookie in je browser.
 *
 * Wat er NIET gebeurt: er wordt niets opgeslagen dat je account kan
 * heropenen. Het cookie is een handtekening over je e-mailadres en een
 * verlooptijd, meer niet. Lekt de database, dan lekt je sessie niet mee.
 */

const COOKIE = 'bob_sessie';

function sleutel() {
  if (!env.secret || env.secret.length < 32) {
    throw Object.assign(
      new Error('BOB_SESSION_SECRET ontbreekt of is te kort (minstens 32 tekens)'),
      { status: 503 },
    );
  }
  return env.secret;
}

const teken = (kern: string) => createHmac('sha256', sleutel()).update(kern).digest('base64url');

function klopt(kern: string, handtekening: string) {
  const verwacht = teken(kern);
  const a = Buffer.from(handtekening);
  const b = Buffer.from(verwacht);
  // Lengte eerst vergelijken: timingSafeEqual gooit bij ongelijke lengtes.
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---------------- sessiecookie ---------------- */

export function maakSessie(email: string) {
  const tot = Date.now() + env.sessieDagen * 86_400_000;
  const kern = `${Buffer.from(email.toLowerCase()).toString('base64url')}.${tot}`;
  return `${kern}.${teken(kern)}`;
}

export function leesSessie(waarde?: string | null): string | null {
  if (!waarde) return null;
  const stukken = waarde.split('.');
  if (stukken.length !== 3) return null;
  const [emailB64, tot, sig] = stukken;
  if (!klopt(`${emailB64}.${tot}`, sig)) return null;
  if (Number(tot) < Date.now()) return null;
  try { return Buffer.from(emailB64, 'base64url').toString(); } catch { return null; }
}

export const cookieNaam = COOKIE;

export const cookieOpties = {
  httpOnly: true,
  secure: env.site.startsWith('https://'),
  sameSite: 'lax' as const,
  path: '/',
  maxAge: env.sessieDagen * 86_400,
};

/* ---------------- inloglink ---------------- */

/**
 * Een eenmalige token. De willekeurige id erin is wat hem eenmalig maakt:
 * bij gebruik wordt die id onthouden, en een tweede klik op dezelfde link
 * ketst daarop af. Zonder dat zou een link uit je mailbox eeuwig herbruikbaar
 * zijn tot hij verloopt.
 */
export function maakInlogToken(email: string, geldigMs = 10 * 60_000) {
  const id = randomBytes(9).toString('base64url');
  const tot = Date.now() + geldigMs;
  const kern = `${Buffer.from(email.toLowerCase()).toString('base64url')}.${tot}.${id}`;
  return { token: `${kern}.${teken(kern)}`, id };
}

export function leesInlogToken(token: string): { email: string; id: string } | null {
  const stukken = token.split('.');
  if (stukken.length !== 4) return null;
  const [emailB64, tot, id, sig] = stukken;
  if (!klopt(`${emailB64}.${tot}.${id}`, sig)) return null;
  if (Number(tot) < Date.now()) return null;
  try { return { email: Buffer.from(emailB64, 'base64url').toString(), id }; } catch { return null; }
}

/* ---------------- ondertekende state (OAuth) ---------------- */

export function tekenState(email: string) {
  const kern = `${Buffer.from(email).toString('base64url')}.${Date.now()}.${randomBytes(6).toString('hex')}`;
  return `${kern}.${teken(kern)}`;
}

export function leesState(state: string, maxLeeftijdMs = 10 * 60_000): string | null {
  const stukken = state.split('.');
  if (stukken.length !== 4) return null;
  const [emailB64, ts, nonce, sig] = stukken;
  if (!klopt(`${emailB64}.${ts}.${nonce}`, sig)) return null;
  if (Date.now() - Number(ts) > maxLeeftijdMs) return null;
  try { return Buffer.from(emailB64, 'base64url').toString(); } catch { return null; }
}
