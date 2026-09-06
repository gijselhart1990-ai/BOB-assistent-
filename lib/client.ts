'use client';

/** Kleine ophaalhulp. Fouten komen als tekst terug, niet als kale 500. */
export async function haal<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    if (!res.ok) throw new Error(`${res.status} op ${url}`);
    return (await res.blob()) as unknown as T;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${res.status} op ${url}`);
  return data as T;
}

export const esc = (s: unknown) => String(s ?? '');

export const hhmm = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(+d) ? '' : d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
};

export const initialen = (naam?: string) =>
  (String(naam || '').match(/\p{L}+/gu) || ['?']).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const alleenDatum = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const dagenTussen = (a: Date, b: Date) => Math.round((+alleenDatum(a) - +alleenDatum(b)) / 86_400_000);
export const naarDatumVeld = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
