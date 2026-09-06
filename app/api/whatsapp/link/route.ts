import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { voerUitOpLaptop } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

/** Start het koppelen op je laptop; de QR verschijnt daarna via /qr. */
export async function POST() {
  try {
    const u = await eisGebruiker();
    const r = await voerUitOpLaptop(u.id, 'whatsapp_link', {}, { wachtMs: 20_000 });
    return json(r.ok ? { ok: true, gestart: true } : { ok: false, error: r.fout });
  } catch (err) { return fout(err); }
}
