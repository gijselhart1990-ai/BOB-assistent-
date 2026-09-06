import { json, fout } from '@/lib/http';
import { gebruikerVanBrugToken } from '@/lib/bridgeAuth';
import { meldResultaat } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const gebruiker = await gebruikerVanBrugToken(req);
    const { id, ok, resultaat, fout: melding } = await req.json().catch(() => ({}));
    if (!id) return json({ ok: false, error: 'Geen id' }, { status: 400 });
    await meldResultaat(gebruiker, String(id), Boolean(ok), resultaat, melding);
    return json({ ok: true });
  } catch (err) { return fout(err); }
}
