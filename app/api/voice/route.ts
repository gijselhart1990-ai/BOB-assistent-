import { eisGebruiker } from '@/lib/auth';
import { fout } from '@/lib/http';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Spraak. De Cartesia-sleutel blijft op de server: de browser krijgt alleen
 * audio terug, nooit de sleutel zelf.
 */
export async function POST(req: Request) {
  try {
    await eisGebruiker();
    if (!env.cartesia.key || !env.cartesia.voice) {
      return Response.json({ ok: false, error: 'CARTESIA_API_KEY of CARTESIA_VOICE_ID ontbreekt' }, { status: 503 });
    }
    const { text } = await req.json().catch(() => ({ text: '' }));
    const tekst = String(text || '').trim().slice(0, 3000);
    if (!tekst) return Response.json({ ok: false, error: 'Geen tekst' }, { status: 400 });

    const res = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'Cartesia-Version': env.cartesia.version,
        Authorization: `Bearer ${env.cartesia.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: env.cartesia.tts,
        transcript: tekst,
        language: env.cartesia.taal,
        voice: { id: env.cartesia.voice },
        output_format: { container: 'mp3', encoding: 'mp3', sample_rate: 44100, bit_rate: 128000 },
      }),
    });
    if (!res.ok) {
      return Response.json({ ok: false, error: `Cartesia ${res.status}: ${(await res.text()).slice(0, 200)}` }, { status: 502 });
    }
    return new Response(await res.arrayBuffer(), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (err) { return fout(err); }
}
