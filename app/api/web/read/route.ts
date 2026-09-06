import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { webLees } from '@/lib/web/read';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await eisGebruiker();
    const { url } = await req.json().catch(() => ({ url: '' }));
    return json({ ok: true, ...(await webLees(url)) });
  } catch (err) { return fout(err); }
}
