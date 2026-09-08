import { json, fout } from '@/lib/http';
import { gebruikerVanBrugToken } from '@/lib/bridgeAuth';
import { meldResultaat } from '@/lib/bridge';
import { beslissing } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const gebruiker = await gebruikerVanBrugToken(req);
    const body = await req.json().catch(() => null);
    const { id, toegestaan } = beslissing(body, 'ok');
    await meldResultaat(gebruiker, id, toegestaan, body.resultaat, typeof body.fout === 'string' ? body.fout : undefined);
    return json({ ok: true });
  } catch (err) { return fout(err); }
}
