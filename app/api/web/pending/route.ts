import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { openBevestiging } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

/** Het dashboard vraagt hier of BOB ergens op wacht. */
export async function GET() {
  try {
    const u = await eisGebruiker();
    return json({ ok: true, pending: await openBevestiging(u.id) });
  } catch (err) { return fout(err); }
}
