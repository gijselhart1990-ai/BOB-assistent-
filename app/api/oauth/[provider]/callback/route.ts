import { redirect } from 'next/navigation';
import { leesState } from '@/lib/session';
import { wisselCode as googleWissel } from '@/lib/connectors/google';
import { wisselCode as msWissel, microsoftContext } from '@/lib/connectors/microsoft';
import { eisGebruiker } from '@/lib/auth';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { leesMicrosoftAanmelding, microsoftOAuthCookie } from '@/lib/microsoft-oauth';
import { eersteKeer } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const err = url.searchParams.get('error');

  const terug = (melding: string) => redirect(`/instellingen?koppeling=${provider}&melding=${encodeURIComponent(melding)}`);

  if (provider === 'microsoft') {
    try {
      const jar = await cookies();
      const cookie = jar.get(microsoftOAuthCookie)?.value || '';
      jar.delete(microsoftOAuthCookie);
      const user = await eisGebruiker();
      const context = await microsoftContext(user.id);
      const login = leesMicrosoftAanmelding(cookie, state, user.id, context?.subject || '', env.secret);
      if (!await eersteKeer(`microsoft-oauth:${login.state}`)) throw new Error('Aanmelding al gebruikt.');
      if (err || !code) throw new Error('Aanmelding afgebroken.');
      await msWissel(user.id, code, login.verifier, login.context);
    } catch {
      return terug('Outlook koppelen is mislukt. Gebruik de ingestelde mailbox en werkcontext, en begin opnieuw vanuit Instellingen.');
    }
    return terug('Gekoppeld.');
  }

  if (err) return terug(`${provider} gaf een fout terug: ${err}`);
  if (!code) return terug('Geen autorisatiecode ontvangen.');

  const uitState = leesState(state);
  // Twee controles: de ondertekende state én de sessie van wie er nu klikt.
  // Alleen de eerste zou een gestolen link laten werken; alleen de tweede zou
  // een callback van een andere site laten binnenkomen.
  const gebruiker = await eisGebruiker().catch(() => null);
  if (!uitState || !gebruiker || uitState !== gebruiker.id) {
    return terug('De koppeling kon niet worden geverifieerd. Probeer opnieuw vanuit het dashboard.');
  }

  try {
    if (provider === 'google') await googleWissel(gebruiker.id, code);
    else return terug(`Onbekende provider: ${provider}`);
  } catch {
    return terug('Koppelen is mislukt. Controleer de Google- of Microsoft-configuratie en de accountopslag.');
  }
  redirect(`/instellingen?koppeling=${provider}&melding=${encodeURIComponent('Gekoppeld.')}`);
}
