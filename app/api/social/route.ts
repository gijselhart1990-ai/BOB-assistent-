import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { social } from '@/lib/connectors/social';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await eisGebruiker();
    return json(await social.panel());
  } catch (err) { return fout(err); }
}
