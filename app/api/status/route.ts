import { eisGebruiker } from '@/lib/auth';
import { capabilities } from '@/lib/env';
import { json, fout } from '@/lib/http';
import { google } from '@/lib/connectors/google';
import { microsoft } from '@/lib/connectors/microsoft';
import { brugStatus } from '@/lib/bridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const u = await eisGebruiker();
    const [g, m, brug] = await Promise.all([
      google.gekoppeld(u.id).catch(() => false),
      microsoft.gekoppeld(u.id).catch(() => false),
      brugStatus(u.id),
    ]);
    return json({
      ok: true,
      gebruiker: { email: u.email },
      capabilities: capabilities(),
      gekoppeld: { google: g, microsoft: m },
      brug,
    });
  } catch (err) { return fout(err); }
}
