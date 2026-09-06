import { redirect } from 'next/navigation';
import { eisGebruiker } from '@/lib/auth';
import { fout } from '@/lib/http';
import { autorisatieUrl as googleUrl } from '@/lib/connectors/google';
import { autorisatieUrl as msUrl } from '@/lib/connectors/microsoft';
import { tekenState } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  try {
    const u = await eisGebruiker();
    const { provider } = await ctx.params;
    const state = tekenState(u.id);
    if (provider === 'google') redirect(googleUrl(state));
    if (provider === 'microsoft') redirect(msUrl(state));
    return Response.json({ ok: false, error: `Onbekende provider: ${provider}` }, { status: 404 });
  } catch (err) {
    // redirect() gooit intern; die moet doorgelaten worden.
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    return fout(err);
  }
}
