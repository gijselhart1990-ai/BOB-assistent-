import { redirect } from 'next/navigation';
import { eisGebruiker } from '@/lib/auth';
import { fout } from '@/lib/http';
import { autorisatieUrl as googleUrl } from '@/lib/connectors/google';
import { autorisatieUrl as msUrl } from '@/lib/connectors/microsoft';
import { tekenState } from '@/lib/session';
import { env } from '@/lib/env';
import { meerdereGoogleAccounts } from '@/lib/google-accounts';
import { googleAccountStore } from '@/lib/google-account-store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  try {
    const u = await eisGebruiker();
    const { provider } = await ctx.params;
    const state = tekenState(u.id);
    if (provider === 'google') {
      if (!env.google.id || !env.google.secret) return Response.json({ ok: false, error: 'Google is nog niet ingesteld.' }, { status: 503 });
      if (meerdereGoogleAccounts()) await googleAccountStore(u.id).list();
      redirect(googleUrl(state));
    }
    if (provider === 'microsoft') redirect(msUrl(state));
    return Response.json({ ok: false, error: `Onbekende provider: ${provider}` }, { status: 404 });
  } catch (err) {
    // redirect() gooit intern; die moet doorgelaten worden.
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    return fout(err);
  }
}
