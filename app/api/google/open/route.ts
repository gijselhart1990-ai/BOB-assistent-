import { NextResponse } from 'next/server';
import { eisGebruiker } from '@/lib/auth';
import { gekozenGoogleAccount, meerdereGoogleAccounts } from '@/lib/google-accounts';
import { fout, json } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await eisGebruiker();
    const service = new URL(req.url).searchParams.get('service');
    // Alleen vaste bestemmingen; nooit een door de aanvrager aangeleverde URL.
    const destination = service === 'gmail' ? 'https://mail.google.com/mail/'
      : service === 'calendar' ? 'https://calendar.google.com/calendar/' : null;
    if (!destination) return json({ ok: false, error: 'Onbekende Google-dienst.' }, { status: 400 });
    const url = new URL(destination);
    if (meerdereGoogleAccounts()) {
      const account = await gekozenGoogleAccount(user.id);
      if (!account) return json({ ok: false, error: 'Kies eerst een gekoppeld Google-account in BOB.' }, { status: 409 });
      url.searchParams.set('authuser', account.email);
    }
    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) { return fout(err); }
}
