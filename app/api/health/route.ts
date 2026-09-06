import { json } from '@/lib/http';

// Openbaar en bewust leeg: alleen "de site leeft". Geen versies, geen
// configuratie, niets waar iemand iets aan heeft die er niet hoort te zijn.
export const dynamic = 'force-dynamic';

export async function GET() {
  return json({ ok: true });
}
