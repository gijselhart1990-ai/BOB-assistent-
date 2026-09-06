import { randomBytes } from 'node:crypto';
import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { maak, zoek, verwijder } from '@/lib/xano';
import { hashToken } from '@/lib/bridgeAuth';

export const dynamic = 'force-dynamic';

/** Overzicht van uitgegeven tokens — nooit de tokens zelf, alleen wanneer. */
export async function GET() {
  try {
    const u = await eisGebruiker();
    const rijen = await zoek<{ naam: string; aangemaakt: string; laatst_gebruikt: string | null }>(
      'bridge_tokens', { gebruiker: u.id },
    );
    return json({ ok: true, tokens: rijen.map(({ naam, aangemaakt, laatst_gebruikt }) => ({ naam, aangemaakt, laatst_gebruikt })) });
  } catch (err) { return fout(err); }
}

/**
 * Maakt een nieuw token. Je ziet hem één keer — daarna staat alleen de hash
 * in de database en kan niemand hem meer teruglezen, ik ook niet.
 */
export async function POST(req: Request) {
  try {
    const u = await eisGebruiker();
    const { naam } = await req.json().catch(() => ({}));
    const token = `bob_${randomBytes(32).toString('base64url')}`;
    await maak('bridge_tokens', {
      token_hash: hashToken(token),
      gebruiker: u.id,
      naam: String(naam || 'Laptop').slice(0, 60),
      aangemaakt: new Date().toISOString(),
      laatst_gebruikt: null,
    });
    return json({ ok: true, token, eenmalig: true });
  } catch (err) { return fout(err); }
}

export async function DELETE(req: Request) {
  try {
    const u = await eisGebruiker();
    const { naam } = await req.json().catch(() => ({}));
    if (!naam) return json({ ok: false, error: 'Geef de naam van het token' }, { status: 400 });
    const rijen = await zoek<{ id: number }>('bridge_tokens', { gebruiker: u.id, naam: String(naam) });
    for (const r of rijen) await verwijder('bridge_tokens', r.id);
    return json({ ok: true, verwijderd: rijen.length });
  } catch (err) { return fout(err); }
}
