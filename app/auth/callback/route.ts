import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { staatOpLijst } from '@/lib/auth';
import { leesInlogToken, maakSessie, cookieNaam, cookieOpties } from '@/lib/session';
import { eersteKeer } from '@/lib/blobs';
import { internPad } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Hier komt de inloglink binnen.
 *
 * Drie controles, in deze volgorde:
 *  1. Is de handtekening geldig en de link nog niet verlopen?
 *  2. Is dit de eerste keer dat deze link gebruikt wordt?
 *  3. Staat het adres op de toegangslijst?
 *
 * Die derde is geen formaliteit: een link die gisteren geldig was moet
 * vandaag niets meer waard zijn als je het adres van de lijst hebt gehaald.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const verder = url.searchParams.get('verder') || '/';
  // Alleen paden binnen de site — anders is dit een open redirect.
  const bestemming = internPad(verder);

  if (!token) return NextResponse.redirect(new URL('/login?reden=geen-code', url.origin));

  const gelezen = leesInlogToken(token);
  if (!gelezen) return NextResponse.redirect(new URL('/login?reden=ongeldig', url.origin));

  let nieuw: boolean;
  try { nieuw = await eersteKeer(gelezen.id); }
  catch { return NextResponse.redirect(new URL('/login?reden=opslag', url.origin)); }
  if (!nieuw) {
    return NextResponse.redirect(new URL('/login?reden=gebruikt', url.origin));
  }

  if (!staatOpLijst(gelezen.email)) {
    return NextResponse.redirect(new URL('/login?reden=geen-toegang', url.origin));
  }

  const jar = await cookies();
  jar.set(cookieNaam, maakSessie(gelezen.email), cookieOpties);
  return NextResponse.redirect(new URL(bestemming, url.origin));
}
