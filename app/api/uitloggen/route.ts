import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { cookieNaam, cookieOpties } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Uitloggen is hier één ding: het cookie weghalen. Er staat niets op de
 * server dat een sessie in leven houdt, dus zonder cookie is de sessie weg —
 * ook als iemand hem eerder gekopieerd had, want zonder de handtekening
 * verloopt hij vanzelf.
 */
export async function POST(req: Request) {
  const jar = await cookies();
  jar.set(cookieNaam, '', { ...cookieOpties, maxAge: 0 });
  return NextResponse.redirect(new URL('/login', new URL(req.url).origin), { status: 303 });
}
