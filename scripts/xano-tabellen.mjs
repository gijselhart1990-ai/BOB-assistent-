#!/usr/bin/env node
/**
 * Zet de vier tabellen klaar in Xano — of vertelt wat er nog mist.
 *
 *   node scripts/xano-tabellen.mjs           kijken wat er is
 *   node scripts/xano-tabellen.mjs --maak    aanmaken wat ontbreekt
 *
 * Aan het eind komen de regels eruit die je in Netlify moet plakken. Xano
 * werkt met tabel-ID's, niet met namen, en die krijg je pas als de tabel
 * bestaat — vandaar dit script in plaats van een lijstje in SETUP.md.
 *
 * Wat dit script NIET doet: endpoints bouwen, functies aanmaken, of iets
 * anders in Xano dan tabellen. Alle logica staat in de website. Dat was de
 * afspraak: zo min mogelijk in Xano, zodat je op één plek kunt kijken als
 * er iets niet klopt.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, '..');

/* .env inlezen zonder extra pakket. */
for (const naam of ['.env.local', '.env']) {
  const pad = resolve(wortel, naam);
  if (!existsSync(pad)) continue;
  for (const regel of readFileSync(pad, 'utf8').split('\n')) {
    const m = regel.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const INSTANCE = (process.env.XANO_INSTANCE_URL || '').trim().replace(/\/$/, '');
const TOKEN = (process.env.XANO_METADATA_TOKEN || '').trim();
const WORKSPACE = (process.env.XANO_WORKSPACE_ID || '').trim();
const MAAK = process.argv.includes('--maak');

if (!INSTANCE || !TOKEN || !WORKSPACE) {
  console.error(`
  Er ontbreekt iets. Zet deze drie in .env of in je omgeving:

    XANO_INSTANCE_URL    bijv. https://x8ki-letl-twmt.n7.xano.io
    XANO_METADATA_TOKEN  Xano → Account → Metadata API → token met
                         "Workspace Content: Read/Write" en
                         "Workspace Database: Read/Write"
    XANO_WORKSPACE_ID    het nummer in de URL van je workspace
`);
  process.exit(1);
}

const BASIS = `${INSTANCE}/api:meta/workspace/${WORKSPACE}`;

async function api(pad, init = {}) {
  const res = await fetch(`${BASIS}${pad}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const tekst = await res.text();
  let data = null;
  try { data = tekst ? JSON.parse(tekst) : null; } catch { /* geen JSON */ }
  if (!res.ok) {
    const melding = data?.message || tekst.slice(0, 300) || res.statusText;
    throw new Error(`Xano ${res.status} op ${pad}: ${melding}`);
  }
  return data;
}

/* Xano zet zelf al een id en created_at neer; die staan hier niet bij. */
const veld = (name, type, extra = {}) => ({
  name, type, description: '', nullable: true, default: '',
  required: false, access: 'public', sensitive: false, style: 'single', ...extra,
});

const TABELLEN = [
  {
    naam: 'bob_oauth_tokens',
    env: 'XANO_TABLE_OAUTH_TOKENS',
    waarvoor: 'De sleutels tot je Google- en Microsoft-agenda en -mail.',
    schema: [
      veld('gebruiker', 'text', { required: true, nullable: false }),
      veld('provider', 'text', { required: true, nullable: false }),
      veld('access_token', 'text', { sensitive: true }),
      veld('refresh_token', 'text', { sensitive: true }),
      veld('expires_at', 'text'),
      veld('scope', 'text'),
      veld('public_client', 'bool', { default: 'false' }),
      veld('bijgewerkt', 'text'),
    ],
  },
  {
    naam: 'bob_berichten',
    env: 'XANO_TABLE_BERICHTEN',
    waarvoor: 'Wat je BOB gevraagd hebt en wat hij antwoordde. Zijn geheugen.',
    schema: [
      veld('gebruiker', 'text', { required: true, nullable: false }),
      veld('rol', 'text', { required: true, nullable: false }),
      veld('inhoud', 'text'),
      veld('stappen', 'text'),
      veld('aangemaakt', 'int'),
    ],
  },
  {
    naam: 'bob_instellingen',
    env: 'XANO_TABLE_INSTELLINGEN',
    waarvoor: 'Wat BOB altijd over je moet weten, in je eigen woorden.',
    schema: [
      veld('gebruiker', 'text', { required: true, nullable: false }),
      veld('context', 'text'),
    ],
  },
  {
    naam: 'bob_bridge_tokens',
    env: 'XANO_TABLE_BRIDGE_TOKENS',
    waarvoor: 'Waarmee je laptop zich meldt. Alleen de hash, nooit het token zelf.',
    schema: [
      veld('gebruiker', 'text', { required: true, nullable: false }),
      veld('token_hash', 'text', { required: true, nullable: false }),
      veld('label', 'text'),
      veld('laatst_gebruikt', 'text'),
    ],
  },
];

const uit = [];

console.log(`\n  Xano — ${INSTANCE}, workspace ${WORKSPACE}\n`);

let bestaande;
try {
  const lijst = await api('/table');
  bestaande = Array.isArray(lijst) ? lijst : (lijst?.items ?? []);
} catch (err) {
  console.error(`  [X] Kan de tabellen niet ophalen.\n      ${err.message}\n`);

  // Bij een 404 is het bijna altijd het workspace-ID. Dat hoeft niemand in
  // een URL te gaan zoeken: Xano vertelt zelf welke workspaces er zijn.
  if (/404/.test(err.message)) {
    try {
      const res = await fetch(`${INSTANCE}/api:meta/workspace`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      const data = await res.json();
      const wss = Array.isArray(data) ? data : (data?.items ?? []);
      if (wss.length) {
        console.error(`      Workspace ${WORKSPACE} bestaat niet. Dit zijn ze wel:\n`);
        for (const w of wss) console.error(`        XANO_WORKSPACE_ID=${w.id}    (${w.name})`);
        console.error('');
      }
    } catch { /* dan niet */ }
  } else {
    console.error('      Meestal: het token mist de scope "Workspace Database: Read".\n');
  }
  process.exit(1);
}

for (const t of TABELLEN) {
  const gevonden = bestaande.find((b) => b.name === t.naam);

  if (gevonden) {
    console.log(`  [v] ${t.naam} — id ${gevonden.id}`);
    uit.push(`${t.env}=${gevonden.id}`);
    continue;
  }

  if (!MAAK) {
    console.log(`  [ ] ${t.naam} — bestaat nog niet`);
    continue;
  }

  try {
    const nieuw = await api('/table', {
      method: 'POST',
      body: JSON.stringify({ name: t.naam, description: t.waarvoor, auth: false }),
    });
    // Schema in een tweede stap: bij het aanmaken accepteert Xano wel een
    // schema-veld, maar de vorm daarvan verschilt per versie. Dit pad is
    // stabiel en de foutmelding is duidelijker als er iets niet klopt.
    await api(`/table/${nieuw.id}/schema`, {
      method: 'PUT',
      body: JSON.stringify({ schema: [veld('id', 'int', { required: true, nullable: false }), ...t.schema] }),
    });
    console.log(`  [+] ${t.naam} — aangemaakt, id ${nieuw.id}`);
    uit.push(`${t.env}=${nieuw.id}`);
  } catch (err) {
    console.log(`  [X] ${t.naam} — aanmaken mislukt: ${err.message}`);
    console.log(`      Maak hem met de hand aan in Xano met deze kolommen:`);
    console.log(`      ${t.schema.map((v) => `${v.name} (${v.type})`).join(', ')}`);
  }
}

console.log('');

if (!MAAK && uit.length < TABELLEN.length) {
  console.log('  Draai `node scripts/xano-tabellen.mjs --maak` om de rest aan te maken.\n');
}

if (uit.length) {
  console.log('  Zet deze regels bij je omgevingsvariabelen (Netlify → Site configuration');
  console.log('  → Environment variables), en in je lokale .env:\n');
  for (const r of uit) console.log(`    ${r}`);
  console.log('');
}

if (uit.length < TABELLEN.length) process.exitCode = 1;
