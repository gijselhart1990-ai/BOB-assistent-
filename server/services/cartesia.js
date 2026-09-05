import { config } from '../config.js';

const C = config.cartesia;

function headers(extra = {}) {
  return {
    'Cartesia-Version': C.version,
    Authorization: `Bearer ${C.apiKey}`,
    ...extra,
  };
}

export function voiceReady() {
  return Boolean(C.apiKey && C.voiceId);
}

/**
 * Tekst -> gesproken audio (mp3).
 * De API-sleutel blijft server-side; de browser krijgt alleen de audio.
 */
export async function speak(text, opts = {}) {
  if (!C.apiKey) throw new Error('CARTESIA_API_KEY ontbreekt in .env');
  if (!C.voiceId && !opts.voiceId) throw new Error('CARTESIA_VOICE_ID ontbreekt in .env');

  const transcript = String(text || '').trim();
  if (!transcript) throw new Error('Niets om uit te spreken');

  const body = {
    model_id: opts.model || C.ttsModel,
    transcript: transcript.slice(0, 5000),
    language: opts.language || C.language,
    voice: { id: opts.voiceId || C.voiceId },
    output_format: {
      container: 'mp3',
      encoding: 'mp3',
      sample_rate: 44100,
      bit_rate: 128000,
    },
  };

  if (opts.speed || opts.emotion || opts.volume) {
    body.generation_config = {};
    if (opts.speed) body.generation_config.speed = Number(opts.speed);
    if (opts.volume) body.generation_config.volume = Number(opts.volume);
    if (opts.emotion) body.generation_config.emotion = opts.emotion;
  }

  const res = await fetch(`${C.base}/tts/bytes`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Cartesia TTS ${res.status}: ${detail.slice(0, 400)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Audio -> tekst. Neemt een Buffer met een audiobestand
 * (webm/ogg/wav/mp3 — wat de browser opneemt) en geeft de transcriptie terug.
 */
export async function transcribe(buffer, filename = 'opname.webm', opts = {}) {
  if (!C.apiKey) throw new Error('CARTESIA_API_KEY ontbreekt in .env');
  if (!buffer || !buffer.length) throw new Error('Lege opname ontvangen');

  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  form.append('model', opts.model || C.sttModel);
  form.append('language', opts.language || C.language);

  const res = await fetch(`${C.base}/stt`, {
    method: 'POST',
    headers: headers(),
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Cartesia STT ${res.status}: ${detail.slice(0, 400)}`);
  }

  const json = await res.json();
  return {
    text: (json.text || '').trim(),
    language: json.language || opts.language || C.language,
    duration: json.duration ?? null,
  };
}

/** Snelle zelftest: klopt de sleutel en bestaat de stem? */
export async function selftest() {
  if (!C.apiKey) return { ok: false, reason: 'CARTESIA_API_KEY ontbreekt' };
  if (!C.voiceId) return { ok: false, reason: 'CARTESIA_VOICE_ID ontbreekt' };
  try {
    const audio = await speak('Test. Bob is online.');
    return { ok: true, bytes: audio.length, voice: C.voiceId, model: C.ttsModel };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}
