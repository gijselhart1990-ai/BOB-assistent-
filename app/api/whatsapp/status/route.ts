import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { voerUitOpLaptop, brugStatus } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const u = await eisGebruiker();
    const brug = await brugStatus(u.id);
    if (!brug.online) return json({ ok: true, brug, gekoppeld: false, boot: 'laptop offline' });
    const r = await voerUitOpLaptop(u.id, 'whatsapp_status', {}, { wachtMs: 20_000 });
    return json({ ok: true, brug, ...(r.ok ? (r.resultaat as object) : { fout: r.fout }) });
  } catch (err) { return fout(err); }
}
