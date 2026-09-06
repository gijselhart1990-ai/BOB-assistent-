import { env } from '@/lib/env';
import { cached, vergeet } from '@/lib/cache';

/**
 * Todoist heeft de afgelopen jaren meerdere API-paden opgeheven. Vandaar
 * meerdere pogingen, met per poging wat er terugkwam — anders krijg je
 * "token verlopen" terwijl het in werkelijkheid een opgeheven endpoint is.
 */
const ENDPOINTS = [
  { basis: 'https://api.todoist.com/api/v1', vorm: 'rest' },
  { basis: 'https://api.todoist.com/rest/v2', vorm: 'rest' },
];
const SYNC_URL = 'https://api.todoist.com/api/v1/sync';

type Poging = { url: string; status: number | null; body: string };

export async function haalTaken() {
  if (!env.todoist.token) throw Object.assign(new Error('TODOIST_API_TOKEN ontbreekt'), { status: 503 });
  const kop = { Authorization: `Bearer ${env.todoist.token}` };
  const pogingen: Poging[] = [];

  for (const e of ENDPOINTS) {
    const url = `${e.basis}/tasks`;
    try {
      const res = await fetch(url, { headers: kop });
      const tekst = await res.text();
      pogingen.push({ url, status: res.status, body: tekst.slice(0, 160) });
      if (res.ok) {
        const data = JSON.parse(tekst);
        const taken = Array.isArray(data) ? data : (data.results || data.items || []);
        return { taken, via: url, pogingen };
      }
    } catch (err) {
      pogingen.push({ url, status: null, body: (err as Error).message });
    }
  }

  // De Sync-API is het oudste en stabielste pad; laatste redmiddel.
  try {
    const res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { ...kop, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ sync_token: '*', resource_types: '["items"]' }),
    });
    const tekst = await res.text();
    pogingen.push({ url: SYNC_URL, status: res.status, body: tekst.slice(0, 160) });
    if (res.ok) {
      const data = JSON.parse(tekst);
      const taken = (data.items || []).filter((t: any) => !t.checked && !t.is_deleted).map((t: any) => ({
        id: String(t.id), content: t.content, due: t.due, priority: t.priority, url: undefined,
      }));
      return { taken, via: SYNC_URL, pogingen };
    }
  } catch (err) {
    pogingen.push({ url: SYNC_URL, status: null, body: (err as Error).message });
  }

  throw Object.assign(new Error('Geen van de Todoist-endpoints werkte'), { pogingen });
}

const alleenDatum = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dagenTussen = (a: Date, b: Date) => Math.round((+alleenDatum(a) - +alleenDatum(b)) / 86_400_000);

function bucket(taken: any[]) {
  const nu = new Date();
  const groepen: Record<string, any[]> = { overdue: [], today: [], tomorrow: [], later: [], someday: [] };

  for (const t of taken) {
    const dueRaw = t.due?.date || t.due?.datetime || null;
    const item = {
      id: String(t.id),
      content: t.content,
      dueString: t.due?.string || (dueRaw ? new Date(dueRaw).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : ''),
      due: dueRaw,
      priority: t.priority ?? 1,
    };
    if (!dueRaw) { groepen.someday.push(item); continue; }
    const d = dagenTussen(new Date(dueRaw), nu);
    if (d < 0) groepen.overdue.push(item);
    else if (d === 0) groepen.today.push(item);
    else if (d === 1) groepen.tomorrow.push(item);
    else groepen.later.push(item);
  }
  return groepen;
}

export const todoist = {
  ingesteld: () => Boolean(env.todoist.token),

  async panel() {
    if (!todoist.ingesteld()) {
      return { ok: false, reason: 'uit' as const, hint: 'Zet TODOIST_API_TOKEN in je omgevingsvariabelen.' };
    }
    try {
      return await cached('todoist:panel', 60_000, async () => {
        const { taken } = await haalTaken();
        const groepen = bucket(taken);
        const counts = Object.fromEntries(Object.entries(groepen).map(([k, v]) => [k, v.length]));
        const kort = Object.fromEntries(Object.entries(groepen).map(([k, v]) => [k, v.slice(0, 4)]));
        return {
          ok: true,
          open: taken.length,
          badge: groepen.overdue.length + groepen.today.length,
          counts,
          groups: kort,
        };
      });
    } catch (err) {
      const e = err as Error & { pogingen?: Poging[] };
      return { ok: false, reason: 'error' as const, error: e.message, pogingen: e.pogingen };
    }
  },

  async afvinken(id: string) {
    const kop = { Authorization: `Bearer ${env.todoist.token}` };
    for (const e of ENDPOINTS) {
      const res = await fetch(`${e.basis}/tasks/${encodeURIComponent(id)}/close`, { method: 'POST', headers: kop });
      if (res.ok) { vergeet('todoist:'); return { ok: true, via: e.basis }; }
    }
    // Ook hier: de Sync-API als vangnet.
    const res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { ...kop, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        commands: JSON.stringify([{ type: 'item_close', uuid: crypto.randomUUID(), args: { id } }]),
      }),
    });
    if (!res.ok) throw new Error(`Afvinken mislukt (${res.status})`);
    vergeet('todoist:');
    return { ok: true, via: 'sync' };
  },
};
