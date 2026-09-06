import { json, fout } from '@/lib/http';
import { gebruikerVanBrugToken } from '@/lib/bridgeAuth';
import { volgendeJob } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

/**
 * "Is er werk voor mij?"
 *
 * Opdrachten die op akkoord wachten worden hier bewust niet meegegeven: die
 * blijven staan tot jij in het dashboard op Toestaan drukt. Zo kan de laptop
 * nooit iets uitvoeren wat jij niet gezien hebt.
 */
export async function GET(req: Request) {
  try {
    const gebruiker = await gebruikerVanBrugToken(req);
    return json({ ok: true, job: await volgendeJob(gebruiker) });
  } catch (err) { return fout(err); }
}
