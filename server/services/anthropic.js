import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT } from '../config.js';
import { memory } from './memory.js';

const A = config.anthropic;

export function brainReady() {
  return Boolean(A.apiKey);
}

/** CLAUDE.md is het lokale contextbestand: wie Sander is, welke ventures, hoe BOB moet klinken. */
function loadContextFile() {
  const candidates = [path.join(ROOT, 'CLAUDE.md'), path.join(ROOT, 'BOB.md')];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').slice(0, 20000);
    } catch { /* stil falen: context is nice-to-have, geen blokkade */ }
  }
  return '';
}

function systemPrompt(liveContext) {
  const now = new Date().toLocaleString(config.locale, { timeZone: config.timezone });
  return [
    `Je bent ${config.name}, de persoonlijke assistent van ${config.user}.`,
    `Het is nu ${now} (${config.timezone}).`,
    '',
    'Stijl: Nederlands, kort, concreet, hoog signaal. Geen inleidingen, geen samenvattingen van',
    'wat je gaat doen. Noem cijfers en namen. Als je iets niet weet of een connector niet',
    'verbonden is, zeg dat in één zin in plaats van te gokken.',
    'Je antwoorden worden soms hardop voorgelezen: schrijf dus uitspreekbaar,',
    'zonder opsommingstekens, tabellen of markdown-opmaak als het antwoord kort is.',
    '',
    '--- CONTEXT OVER DE GEBRUIKER ---',
    loadContextFile() || '(geen CLAUDE.md gevonden)',
    '',
    '--- LOKAAL GEHEUGEN ---',
    memory.context() || '(nog niets apart onthouden)',
    '',
    '--- LIVE DATA VAN HET DASHBOARD ---',
    liveContext || '(geen live data beschikbaar)',
  ].join('\n');
}

/**
 * Stelt een vraag aan Claude met de live dashboarddata als context.
 * history: [{role:'user'|'assistant', content:'...'}]
 */
export async function ask(question, { history = [], liveContext = '', maxTokens = 1024 } = {}) {
  if (!A.apiKey) throw new Error('ANTHROPIC_API_KEY ontbreekt in .env');

  const messages = [
    ...history.slice(-10).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 8000),
    })),
    { role: 'user', content: String(question).slice(0, 8000) },
  ];

  const res = await fetch(`${A.base}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': A.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: A.model,
      max_tokens: maxTokens,
      system: systemPrompt(liveContext),
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 400)}`);
  }

  const json = await res.json();
  const text = (json.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return { text, model: json.model, usage: json.usage };
}
