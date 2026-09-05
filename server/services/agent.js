import { config } from '../config.js';
import { store } from '../store.js';
import { ask, brainReady } from './anthropic.js';
import { memory } from './memory.js';
import { todoist } from '../connectors/todoist.js';
import { briefingText } from '../connectors/index.js';

const MAX_ACTIVITY = 100;
const terminal = new Set(['done', 'failed', 'cancelled']);
const clean = (value, max = 2400) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
const uid = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function jobs() {
  const value = store.read('missions', []);
  return Array.isArray(value) ? value : [];
}

function saveJobs(value) { store.write('missions', value.slice(0, config.agent.maxJobs)); }

function activity() {
  const value = store.read('activity', []);
  return Array.isArray(value) ? value : [];
}

function log(job, message, kind = 'info') {
  const entry = { id: uid('log'), jobId: job?.id || null, message: clean(message, 360), kind, at: Date.now() };
  store.write('activity', [entry, ...activity()].slice(0, MAX_ACTIVITY));
  return entry;
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#x27;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function plainHtml(value) {
  return decodeHtml(String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const privateHost = host === 'localhost' || host.endsWith('.local') ||
      /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || host === '::1';
    return (url.protocol === 'https:' || url.protocol === 'http:') && !privateHost ? url.href : null;
  } catch { return null; }
}

async function fetchRemote(url, maxChars = 700_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'BOB-local-assistant/1.0 (+local research)' },
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return (await response.text()).slice(0, maxChars);
  } finally { clearTimeout(timeout); }
}

async function fetchText(url, maxChars = 9000) {
  return plainHtml(await fetchRemote(url)).slice(0, maxChars);
}

async function searchWeb(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchRemote(url, 700_000);
  const rows = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1];
    if (!/result__a/i.test(attrs)) continue;
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1];
    const target = safeUrl(decodeHtml(href));
    const title = plainHtml(match[2]);
    if (target && title && !rows.some((row) => row.url === target)) rows.push({ title, url: target });
    if (rows.length === 5) break;
  }
  return rows;
}

async function research(instruction, report) {
  report('Ik zoek betrouwbare bronnen…');
  const sources = await searchWeb(instruction);
  if (!sources.length) throw new Error('Zoeken leverde geen leesbare bronnen op. Probeer een specifiekere zoekopdracht.');

  report(`Ik lees ${Math.min(3, sources.length)} bronnen…`);
  const read = await Promise.all(sources.slice(0, 3).map(async (source) => {
    try { return { ...source, excerpt: await fetchText(source.url, 6000) }; }
    catch (err) { return { ...source, excerpt: '', error: clean(err.message, 120) }; }
  }));
  const usable = read.filter((source) => source.excerpt);

  let summary = usable.length
    ? `Ik heb ${usable.length} bron${usable.length === 1 ? '' : 'nen'} gelezen.`
    : 'Ik vond bronnen, maar kon hun inhoud niet uitlezen.';
  if (usable.length && brainReady()) {
    report('Ik vat de bevindingen samen…');
    const dossier = usable.map((source, index) =>
      `BRON ${index + 1}: ${source.title}\nURL: ${source.url}\nTEKST: ${source.excerpt}`).join('\n\n');
    const answer = await ask(
      `Onderzoeksvraag: ${instruction}\n\nGebruik uitsluitend dit dossier. Geef een kort, concreet antwoord in het Nederlands. Noem onzekerheden. Sluit af met een korte lijst Bronnen met de titels en URL's.\n\n${dossier}`,
      { liveContext: '', maxTokens: 1100 },
    );
    summary = answer.text || summary;
  }
  return { summary, sources: read.map(({ title, url, excerpt, error }) => ({ title, url, excerpt: excerpt.slice(0, 700), error })) };
}

function classify(instruction) {
  const text = clean(instruction);
  const todo = text.match(/(?:maak|voeg|zet|plan)\s+(?:een\s+)?(?:nieuwe\s+)?(?:todoist[-\s])?taak(?:\s+aan|\s+toe)?\s*[:\-]?\s*(.+)/i);
  if (todo?.[1]) return { type: 'todoist', title: 'Todoist-taak maken', payload: { content: clean(todo[1], 500) }, explicitExternal: true };

  const remember = text.match(/(?:onthoud|bewaar|remember)\s*(?:dit)?\s*[:\-]?\s*(.+)/i);
  if (remember?.[1]) return { type: 'memory', title: 'In geheugen opslaan', payload: { content: clean(remember[1], 1200) }, safe: true };

  if (/\b(briefing|dagoverzicht|dagoverzichtje)\b/i.test(text)) return { type: 'briefing', title: 'Dagbriefing maken', payload: {}, safe: true };
  if (/\b(zoek|onderzoek|research|lees|verken|vergelijk|check|vind uit)\b/i.test(text)) {
    return { type: 'research', title: 'Onderzoek uitvoeren', payload: { query: text }, safe: true };
  }
  return { type: 'plan', title: 'Opdracht uitwerken', payload: { request: text }, safe: true };
}

function patchJob(id, changes) {
  const all = jobs();
  const job = all.find((item) => item.id === id);
  if (!job) throw new Error('Deze opdracht bestaat niet meer.');
  Object.assign(job, changes, { updatedAt: Date.now() });
  saveJobs(all);
  return job;
}

async function execute(job) {
  const report = (message) => {
    patchJob(job.id, { progress: clean(message, 180) });
    log(job, message);
  };

  if (job.type === 'memory') {
    const item = memory.add(job.payload.content, { source: 'BOB-opdracht' });
    return { text: 'Ik heb dit lokaal onthouden.', memory: item };
  }
  if (job.type === 'todoist') {
    report('Ik maak de Todoist-taak…');
    const result = await todoist.create(job.payload.content);
    return { text: `Toegevoegd aan Todoist: ${job.payload.content}`, todoist: result };
  }
  if (job.type === 'briefing') return { text: await briefingText() };
  if (job.type === 'research') return research(job.payload.query, report);

  report('Ik werk de opdracht uit…');
  if (!brainReady()) throw new Error('ANTHROPIC_API_KEY ontbreekt; ik kan deze open opdracht nog niet uitwerken.');
  const answer = await ask(
    `Werk deze opdracht zelfstandig uit: ${job.payload.request}\n\nGeef het resultaat direct. Als de opdracht een externe actie zou vereisen, voer die niet uit; noem precies welke toestemming of gegevens je nog nodig hebt.`,
    { maxTokens: 1100 },
  );
  return { text: answer.text };
}

/** Een lokale, zichtbare opdrachtwachtrij. Alle stappen komen in het log. */
export const agent = {
  status() {
    const all = jobs();
    return {
      autopilot: config.agent.autopilot,
      jobs: all.sort((a, b) => Number(b.createdAt) - Number(a.createdAt)).slice(0, 30),
      activity: activity().slice(0, 40),
      memory: memory.list(16),
      counts: {
        active: all.filter((job) => ['queued', 'running'].includes(job.status)).length,
        done: all.filter((job) => job.status === 'done').length,
        memory: memory.list().length,
      },
    };
  },

  submit(instruction) {
    const request = clean(instruction);
    if (!request) throw new Error('Geef BOB eerst een opdracht.');
    const kind = classify(request);
    const job = {
      id: uid('job'),
      instruction: request,
      type: kind.type,
      title: kind.title,
      payload: kind.payload,
      status: 'queued',
      progress: 'In wachtrij',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      result: null,
      error: null,
      explicitExternal: Boolean(kind.explicitExternal),
    };
    saveJobs([job, ...jobs()]);
    log(job, `Nieuwe opdracht: ${job.title}`);
    if (config.agent.autopilot || kind.explicitExternal) void this.run(job.id);
    return job;
  },

  async run(id) {
    const current = jobs().find((item) => item.id === id);
    if (!current) throw new Error('Deze opdracht bestaat niet meer.');
    if (terminal.has(current.status)) return current;
    if (current.status === 'running') return current;
    const job = patchJob(id, { status: 'running', progress: 'BOB is bezig…', error: null, startedAt: Date.now() });
    log(job, 'BOB is gestart met de opdracht.');
    try {
      const result = await execute(job);
      // Een lopende download kan niet altijd direct geannuleerd worden. Als
      // de gebruiker intussen op stoppen drukte, mag die afloop de status
      // nooit alsnog naar "klaar" terugzetten.
      const latest = jobs().find((item) => item.id === id);
      if (latest?.status === 'cancelled') return latest;
      const done = patchJob(id, { status: 'done', progress: 'Klaar', result, finishedAt: Date.now() });
      log(done, 'Opdracht afgerond.', 'success');
      return done;
    } catch (err) {
      const latest = jobs().find((item) => item.id === id);
      if (latest?.status === 'cancelled') return latest;
      const failed = patchJob(id, { status: 'failed', progress: 'Kon niet worden afgerond', error: clean(err.message, 800), finishedAt: Date.now() });
      log(failed, `Opdracht gestopt: ${failed.error}`, 'error');
      return failed;
    }
  },

  cancel(id) {
    const job = patchJob(id, { status: 'cancelled', progress: 'Geannuleerd', finishedAt: Date.now() });
    log(job, 'Opdracht geannuleerd.', 'warn');
    return job;
  },

  remember(text) { return memory.add(text, { source: 'handmatig' }); },
  forget(id) { return memory.remove(id); },
};
