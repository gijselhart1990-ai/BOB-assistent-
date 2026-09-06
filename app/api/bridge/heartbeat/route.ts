import { json, fout } from '@/lib/http';
import { gebruikerVanBrugToken } from '@/lib/bridgeAuth';
import { klopAan } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

/** Je laptop klopt hier elke twintig seconden aan. */
export async function POST(req: Request) {
  try {
    const gebruiker = await gebruikerVanBrugToken(req);
    const body = await req.json().catch(() => ({}));
    await klopAan(gebruiker, {
      versie: String(body?.versie || '').slice(0, 40),
      machine: String(body?.machine || '').slice(0, 80),
      mogelijk: body?.mogelijk ?? {},
    });
    return json({ ok: true });
  } catch (err) { return fout(err); }
}
