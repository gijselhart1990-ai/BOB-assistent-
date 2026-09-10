import { cookies } from 'next/headers';
import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { env } from '@/lib/env';
import { accountCookie, gekozenGoogleAccount, meerdereGoogleAccounts } from '@/lib/google-accounts';
import { googleAccountStore } from '@/lib/google-account-store';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user = await eisGebruiker();
    if (!meerdereGoogleAccounts()) return json({ ok: true, accounts: [], selected: null });
    const accounts = await googleAccountStore(user.id).list();
    const selected = await gekozenGoogleAccount(user.id);
    return json({ ok: true, accounts, selected: selected?.subject ?? null });
  } catch { return json({ ok: false, error: 'Google-accountopslag is nog niet beschikbaar.', accounts: [] }, { status: 503 }); }
}

export async function POST(req: Request) {
  try {
    const user = await eisGebruiker();
    if (req.headers.get('origin') !== new URL(env.site).origin) return json({ ok: false }, { status: 403 });
    if (!meerdereGoogleAccounts()) return json({ ok: false }, { status: 503 });
    const body = await req.json();
    if (typeof body.subject !== 'string') return json({ ok: false }, { status: 400 });
    const accounts = await googleAccountStore(user.id).list();
    if (!accounts.some(a => a.subject === body.subject)) return json({ ok: false }, { status: 404 });
    (await cookies()).set(accountCookie, body.subject, { httpOnly: true, sameSite: 'lax', secure: env.site.startsWith('https:'), path: '/', maxAge: 30 * 86400 });
    return json({ ok: true });
  } catch (err) { return fout(err); }
}
