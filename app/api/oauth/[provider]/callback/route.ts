import { redirect } from 'next/navigation';
import { leesState } from '@/lib/session';
import { wisselCode as googleWissel } from '@/lib/connectors/google';
import { wisselCode as msWissel } from '@/lib/connectors/microsoft';
import { eisGebruiker } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const err = url.searchParams.get('error');

  const terug = (melding: string) => redirect(`/instellingen?koppeling=${provider}&melding=${encodeURIComponent(melding)}`);

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
    else if (provider === 'microsoft') await msWissel(gebruiker.id, code);
    else return terug(`Onbekende provider: ${provider}`);
  } catch {
    return terug('Koppelen is mislukt. Controleer de Google- of Microsoft-configuratie en de accountopslag.');
  }
  redirect(`/instellingen?koppeling=${provider}&melding=${encodeURIComponent('Gekoppeld.')}`);
}
