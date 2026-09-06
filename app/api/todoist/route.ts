import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { todoist } from '@/lib/connectors/todoist';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await eisGebruiker();
    return json(await todoist.panel());
  } catch (err) { return fout(err); }
}
