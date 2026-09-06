import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { voerUitOpLaptop } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const u = await eisGebruiker();
    const r = await voerUitOpLaptop(u.id, 'whatsapp_qr', {}, { wachtMs: 20_000 });
    return json(r.ok ? { ok: true, ...(r.resultaat as object) } : { ok: false, error: r.fout });
  } catch (err) { return fout(err); }
}
