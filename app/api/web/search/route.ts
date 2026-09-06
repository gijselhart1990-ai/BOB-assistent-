import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { webZoek } from '@/lib/web/search';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await eisGebruiker();
    const q = new URL(req.url).searchParams.get('q') || '';
    return json({ ok: true, ...(await webZoek(q)) });
  } catch (err) { return fout(err); }
}
