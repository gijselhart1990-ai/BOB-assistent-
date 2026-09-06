import { env } from '@/lib/env';

const BASE = 'https://api.search.brave.com/res/v1/web/search';

export const zoekenKan = () => Boolean(env.brave.key);

export async function webZoek(vraag: string, aantal = 6) {
  if (!env.brave.key) {
    throw Object.assign(new Error('BRAVE_API_KEY ontbreekt — haal een gratis sleutel op bij api-dashboard.search.brave.com'), { status: 503 });
  }
  const q = String(vraag || '').trim();
  if (!q) throw Object.assign(new Error('Lege zoekopdracht'), { status: 400 });

  const url = new URL(BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('count', String(Math.min(20, Math.max(1, aantal))));
  url.searchParams.set('country', env.brave.land);
  url.searchParams.set('search_lang', env.brave.taal);
  url.searchParams.set('safesearch', 'moderate');

  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': env.brave.key, Accept: 'application/json' },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error(`Brave weigert de sleutel (${res.status}).`);
    if (res.status === 429) throw new Error('Brave-limiet bereikt. Probeer het later opnieuw.');
    throw new Error(`Brave ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = await res.json();
  return {
    query: q,
    results: (json.web?.results || []).map((r: { title?: string; url?: string; description?: string }) => ({
      title: r.title || '',
      url: r.url || '',
      description: (r.description || '').replace(/<\/?strong>/g, ''),
    })),
  };
}
