import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { beantwoordBevestiging } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const u = await eisGebruiker();
    const { id, allow } = await req.json().catch(() => ({}));
    if (!id) return json({ ok: false, error: 'Geen id' }, { status: 400 });
    return json(await beantwoordBevestiging(u.id, String(id), Boolean(allow)));
  } catch (err) { return fout(err); }
}
