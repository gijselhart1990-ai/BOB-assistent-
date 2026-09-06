import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { google } from '@/lib/connectors/google';
import { microsoft } from '@/lib/connectors/microsoft';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const u = await eisGebruiker();
    const [g, m] = await Promise.all([
      google.mail(u.id).catch((e) => ({ ok: false, reason: e.message, unread: 0, messages: [] as any[] })),
      microsoft.mail(u.id).catch((e) => ({ ok: false, reason: e.message, unread: 0, messages: [] as any[] })),
    ]);
    return json({ ok: Boolean(g.ok || m.ok), gmail: g, outlook: m, totaal: (g.unread || 0) + (m.unread || 0) });
  } catch (err) { return fout(err); }
}
