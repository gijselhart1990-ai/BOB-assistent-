import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { voerUitOpLaptop, brugStatus } from '@/lib/bridge';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const u = await eisGebruiker();
    const brug = await brugStatus(u.id);
    if (!brug.online) {
      return json({
        ok: false, reason: 'laptop offline',
        hint: 'WhatsApp loopt via je eigen laptop. Start BOB-bridge daar.',
      });
    }
    const r = await voerUitOpLaptop(u.id, 'whatsapp_panel', {}, { wachtMs: 30_000 });
    return json(r.ok ? (r.resultaat as object) : { ok: false, reason: 'error', error: r.fout });
  } catch (err) { return fout(err); }
}
