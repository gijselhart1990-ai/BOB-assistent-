import { config } from '../config.js';
import { cached } from '../store.js';

const TOKEN = () => config.todoist.token;

/**
 * Todoist heeft zijn API's een paar keer omgegooid: sync/v9 en rest/v2 zijn
 * opgeheven en geven nu 410, alles zit onder api/v1. Omdat die paden blijven
 * schuiven proberen we ze op volgorde, met de Sync API als laatste vangnet —
 * die is het meest stabiel en wordt door Todoist zelf gebruikt.
 */
const ENDPOINTS = [
  { base: 'https://api.todoist.com/api/v1', shape: 'rest' },
  { base: 'https://api.todoist.com/rest/v2', shape: 'rest' },
];

const SYNC_URL = 'https://api.todoist.com/api/v1/sync';

/** Haalt open taken op via de Sync API. Werkt ook als de REST-paden wijzigen. */
async function fetchViaSync() {
  const res = await fetch(SYNC_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ sync_token: '*', resource_types: '["items"]' }),
  });
  if (!res.ok) throw new Error(`Todoist sync ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json = await res.json();
  return (json.items || []).filter((t) => !t.checked && !t.is_deleted);
}

/**
 * Probeert de REST-paden en valt terug op de Sync API.
 * Geeft ook terug wélk endpoint werkte, zodat de zelftest niet hoeft te gokken.
 */
export async function fetchTasks() {
  if (!TOKEN()) throw new Error('TODOIST_API_TOKEN ontbreekt');
  const pogingen = [];

  for (const ep of ENDPOINTS) {
    const url = `${ep.base}/tasks`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${TOKEN()}`, Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.results ?? []);
        return { tasks: list, via: url, pogingen };
      }
      pogingen.push({ url, status: res.status, body: (await res.text()).slice(0, 120) });
    } catch (err) {
      pogingen.push({ url, status: 0, body: err.message });
    }
  }

  try {
    const items = await fetchViaSync();
    return { tasks: items, via: SYNC_URL, pogingen };
  } catch (err) {
    pogingen.push({ url: SYNC_URL, status: 0, body: err.message });
  }

  const samenvatting = pogingen.map((p) => `${p.url} -> ${p.status || 'geen antwoord'}: ${p.body}`).join(' | ');
  const err = new Error(samenvatting);
  err.pogingen = pogingen;
  throw err;
}

function normalise(task) {
  const due = task.due || {};
  return {
    id: String(task.id),
    content: task.content || '',
    due: due.date || due.datetime || null,
    dueString: due.string || null,
    recurring: Boolean(due.is_recurring),
    priority: task.priority || 1,
    project: task.project_id ? String(task.project_id) : null,
    url: task.url || `https://app.todoist.com/app/task/${task.id}`,
  };
}

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function bucket(tasks) {
  const today = new Date();
  const todayKey = ymd(today);
  const tomorrowKey = ymd(new Date(today.getTime() + 86400000));

  // "later" = heeft een datum, na morgen. "someday" = helemaal geen datum
  // (Todoist-taken zonder due date — vaak een backlog, dus apart gehouden
  // in plaats van ze tussen de geplande taken te mengen).
  const groups = { overdue: [], today: [], tomorrow: [], later: [], someday: [] };
  for (const t of tasks) {
    if (!t.due) { groups.someday.push(t); continue; }
    const key = t.due.slice(0, 10);
    if (key < todayKey) groups.overdue.push(t);
    else if (key === todayKey) groups.today.push(t);
    else if (key === tomorrowKey) groups.tomorrow.push(t);
    else groups.later.push(t);
  }
  groups.later.sort((a, b) => a.due.localeCompare(b.due));
  return groups;
}

export const todoist = {
  id: 'todoist',
  label: 'Todoist',
  configured: () => Boolean(TOKEN()),

  async panel() {
    if (!TOKEN()) return { ok: false, reason: 'not_configured', hint: 'Zet TODOIST_API_TOKEN in .env en herstart BOB' };

    // Fouten hier zelf afvangen. Lieten we ze doorgooien, dan verdween de
    // oorzaak onderweg en meldde het dashboard "niet gekoppeld" terwijl het
    // token gewoon in .env staat — misleidend als het in werkelijkheid een
    // proxy of een verlopen token is.
    try {
      return await this._load();
    } catch (err) {
      const msg = String(err?.message || err);
      const proxy = /allowlist|proxy|blocked|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|fetch failed/i.test(msg);
      const auth = /\b401\b|\b403\b/.test(msg) && !proxy;
      return {
        ok: false,
        reason: 'error',
        hint: auth
          ? `Todoist weigert je token. Maak een nieuw token aan: Todoist → Instellingen → Integraties → Ontwikkelaar. (${msg.slice(0, 120)})`
          : proxy
            ? `Todoist is niet bereikbaar vanaf deze computer — waarschijnlijk je netwerk of proxy, niet je token. (${msg.slice(0, 120)})`
            : msg.slice(0, 200),
      };
    }
  },

  async _load() {
    return cached('todoist:panel', 60_000, async () => {
      const { tasks: raw } = await fetchTasks();
      const tasks = (Array.isArray(raw) ? raw : []).map(normalise);
      const groups = bucket(tasks);
      return {
        ok: true,
        open: tasks.length,
        badge: groups.overdue.length + groups.today.length,
        groups: {
          overdue: groups.overdue.slice(0, 8),
          today: groups.today.slice(0, 10),
          tomorrow: groups.tomorrow.slice(0, 6),
          later: groups.later.slice(0, 12),
          someday: groups.someday.slice(0, 6),
        },
        // Volledige aantallen, ook als de lijst hierboven is afgekapt —
        // zo kan het dashboard "+N meer in Todoist" tonen in plaats van
        // stilzwijgend taken te verbergen.
        counts: {
          overdue: groups.overdue.length,
          today: groups.today.length,
          tomorrow: groups.tomorrow.length,
          later: groups.later.length,
          someday: groups.someday.length,
        },
      };
    });
  },

  async complete(id) {
    if (!TOKEN()) throw new Error('Todoist niet verbonden');

    for (const ep of ENDPOINTS) {
      try {
        const res = await fetch(`${ep.base}/tasks/${id}/close`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${TOKEN()}` },
        });
        if (res.ok || res.status === 204) return { ok: true, via: ep.base };
      } catch { /* volgende proberen */ }
    }

    // Vangnet via de Sync API, net als bij het ophalen.
    const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        commands: JSON.stringify([{ type: 'item_close', uuid, args: { id: String(id) } }]),
      }),
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      const status = json.sync_status?.[uuid];
      if (status === 'ok' || status === undefined) return { ok: true, via: SYNC_URL };
      throw new Error(`Todoist weigerde het afvinken: ${JSON.stringify(status).slice(0, 120)}`);
    }
    throw new Error(`Afvinken mislukt (${res.status})`);
  },

  /** Een taak wordt alleen via de expliciete BOB-opdracht aangemaakt. */
  async create(content) {
    if (!TOKEN()) throw new Error('Todoist niet verbonden');
    const text = String(content || '').trim().slice(0, 500);
    if (!text) throw new Error('De Todoist-taak heeft geen inhoud.');
    let lastError = '';
    for (const ep of ENDPOINTS) {
      try {
        const res = await fetch(`${ep.base}/tasks`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });
        if (res.ok) {
          const task = await res.json().catch(() => ({}));
          return { ok: true, id: String(task.id || ''), url: task.url || '', content: task.content || text };
        }
        lastError = `${res.status}: ${(await res.text()).slice(0, 160)}`;
      } catch (err) { lastError = err.message; }
    }
    throw new Error(`Todoist-taak maken mislukt (${lastError || 'geen antwoord'})`);
  },

  async summary() {
    const p = await this.panel();
    if (!p.ok) return 'Todoist: niet verbonden.';
    const { overdue = [], today = [] } = p.groups;
    const parts = [`${p.open} open taken`];
    if (overdue.length) parts.push(`${overdue.length} over tijd`);
    if (today.length) parts.push(`vandaag: ${today.map((t) => t.content).slice(0, 5).join('; ')}`);
    return `Todoist: ${parts.join(', ')}.`;
  },
};
