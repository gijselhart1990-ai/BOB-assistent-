import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { google } from '@/lib/connectors/google';
import { microsoft } from '@/lib/connectors/microsoft';

export const dynamic = 'force-dynamic';

/** Eén agenda uit alle bronnen, op tijd gesorteerd. */
export async function GET(req: Request) {
  try {
    const u = await eisGebruiker();
    const offset = Number(new URL(req.url).searchParams.get('offset') || 0) || 0;
    const [g, m] = await Promise.all([
      google.agenda(u.id, offset).catch((e) => ({ ok: false, reason: e.message, events: [] as any[] })),
      microsoft.agenda(u.id, offset).catch((e) => ({ ok: false, reason: e.message, events: [] as any[] })),
    ]);
    const events = [...(g.events || []), ...(m.events || [])]
      .sort((a, b) => String(a.start).localeCompare(String(b.start)));
    return json({
      ok: Boolean(g.ok || m.ok),
      bronnen: { google: g.ok ? 'ok' : (g as any).reason, microsoft: m.ok ? 'ok' : (m as any).reason },
      events,
    });
  } catch (err) { return fout(err); }
}
