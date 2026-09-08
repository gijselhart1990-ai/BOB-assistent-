import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { beantwoordBevestiging } from '@/lib/bridge';
import { beslissing } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const u = await eisGebruiker();
    const { id, toegestaan } = beslissing(await req.json().catch(() => null), 'allow');
    return json(await beantwoordBevestiging(u.id, id, toegestaan));
  } catch (err) { return fout(err); }
}
