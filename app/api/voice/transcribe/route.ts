import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Spraak naar tekst, ook via de server zodat de sleutel daar blijft. */
export async function POST(req: Request) {
  try {
    await eisGebruiker();
    if (!env.cartesia.key) return json({ ok: false, error: 'CARTESIA_API_KEY ontbreekt' }, { status: 503 });

    const inkomend = await req.formData();
    const bestand = inkomend.get('audio');
    if (!(bestand instanceof Blob)) return json({ ok: false, error: 'Geen audio ontvangen' }, { status: 400 });

    const form = new FormData();
    form.append('file', bestand, 'opname.webm');
    form.append('model', env.cartesia.stt);
    form.append('language', env.cartesia.taal);

    const res = await fetch('https://api.cartesia.ai/stt', {
      method: 'POST',
      headers: { 'Cartesia-Version': env.cartesia.version, Authorization: `Bearer ${env.cartesia.key}` },
      body: form,
    });
    if (!res.ok) return json({ ok: false, error: `Cartesia STT ${res.status}: ${(await res.text()).slice(0, 200)}` }, { status: 502 });
    const d = await res.json();
    return json({ ok: true, text: d.text || '' });
  } catch (err) { return fout(err); }
}
