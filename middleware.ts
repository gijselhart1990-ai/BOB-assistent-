import { NextResponse, type NextRequest } from 'next/server';

/**
 * De voordeur.
 *
 * Alles behalve de inlogpagina en de brug vereist een geldig sessiecookie.
 * De toegangslijst wordt hier niet gecontroleerd — dat gebeurt server-side
 * per route en per pagina, zodat een geldige handtekening zonder plek op de
 * lijst alsnog nergens komt. Twee sloten op één deur, met opzet.
 *
 * De middleware draait op Netlify's edge, waar node:crypto niet bestaat.
 * Daarom wordt de handtekening hier met Web Crypto gecontroleerd — dezelfde
 * HMAC-SHA256 als in lib/session.ts, alleen met een andere API.
 */
const OPEN = ['/login', '/auth/callback', '/api/inloggen', '/api/bridge', '/api/health'];

const COOKIE = 'bob_sessie';

function base64url(buf: ArrayBuffer) {
  let s = '';
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function handtekeningKlopt(kern: string, sig: string, geheim: string) {
  const sleutel = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(geheim),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const verwacht = base64url(await crypto.subtle.sign('HMAC', sleutel, new TextEncoder().encode(kern)));
  // Vaste-tijd vergelijking: geen vroege exit op het eerste verschil.
  if (verwacht.length !== sig.length) return false;
  let verschil = 0;
  for (let i = 0; i < verwacht.length; i++) verschil |= verwacht.charCodeAt(i) ^ sig.charCodeAt(i);
  return verschil === 0;
}

async function sessieGeldig(waarde: string | undefined, geheim: string) {
  if (!waarde) return false;
  const stukken = waarde.split('.');
  if (stukken.length !== 3) return false;
  const [emailB64, tot, sig] = stukken;
  if (Number(tot) < Date.now()) return false;
  return handtekeningKlopt(`${emailB64}.${tot}`, sig, geheim);
}

export async function middleware(req: NextRequest) {
  const pad = req.nextUrl.pathname;
  if (OPEN.some((p) => pad === p || pad.startsWith(`${p}/`))) return NextResponse.next();

  const geheim = process.env.BOB_SESSION_SECRET;
  // Zonder ondertekeningssleutel kan niemand herkend worden. Dan is
  // dichtgooien het enige verantwoorde antwoord — nooit doorlaten.
  if (!geheim || geheim.length < 32) {
    return pad.startsWith('/api/')
      ? NextResponse.json({ ok: false, error: 'BOB_SESSION_SECRET ontbreekt of is te kort' }, { status: 503 })
      : NextResponse.redirect(new URL('/login?reden=config', req.url));
  }

  if (await sessieGeldig(req.cookies.get(COOKIE)?.value, geheim)) return NextResponse.next();

  if (pad.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'Niet ingelogd' }, { status: 401 });
  }
  const naar = new URL('/login', req.url);
  if (pad !== '/') naar.searchParams.set('verder', pad);
  return NextResponse.redirect(naar);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
