#!/usr/bin/env node
/**
 * `npm run doctor` — controleert in één keer wat werkt en wat niet.
 * Draai dit als er iets niet doet wat je verwacht.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ok   = (m) => console.log(`\x1b[32m  ✓\x1b[0m ${m}`);
const bad  = (m) => console.log(`\x1b[31m  ✗\x1b[0m ${m}`);
const skip = (m) => console.log(`\x1b[90m  ○\x1b[0m ${m}`);
const head = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

let failures = 0;
const fail = (m) => { failures++; bad(m); };

head('Basis');

const [major] = process.versions.node.split('.').map(Number);
major >= 20 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node} — BOB heeft 20 of hoger nodig`);

fs.existsSync(path.join(ROOT, '.env'))
  ? ok('.env gevonden')
  : fail('.env ontbreekt — kopieer .env.example naar .env');

fs.existsSync(path.join(ROOT, 'node_modules'))
  ? ok('node_modules aanwezig')
  : fail('node_modules ontbreekt — draai `npm install`');

fs.existsSync(path.join(ROOT, 'CLAUDE.md'))
  ? ok('CLAUDE.md gevonden (BOB kent je context)')
  : skip('CLAUDE.md ontbreekt — BOB werkt, maar weet weinig van je');

// Staat demomodus aan terwijl er al connectoren gekoppeld zijn, dan kijk je
// naar voorbeelddata terwijl je je eigen agenda verwacht. Dat is precies het
// soort stille verwarring waar deze zelftest voor bedoeld is.
const connectors = ['TODOIST_API_TOKEN', 'GOOGLE_CLIENT_ID', 'MICROSOFT_CLIENT_ID', 'ANTHROPIC_API_KEY']
  .filter((k) => process.env[k]);

if (['1', 'true', 'yes', 'ja', 'on'].includes(String(process.env.BOB_DEMO || '').toLowerCase())) {
  if (connectors.length) {
    fail('BOB_DEMO=1 — het dashboard toont VOORBEELDDATA, niet je eigen agenda of taken');
    console.log(`     → je hebt wél ${connectors.length} connector(en) ingesteld; zet BOB_DEMO=0 in .env en herstart`);
  } else {
    skip('BOB_DEMO=1 — demomodus, logisch zolang er nog niets gekoppeld is');
  }
} else {
  ok('Demomodus uit — je ziet je eigen data');
}

head('Cartesia — stem');

const CART = {
  key: process.env.CARTESIA_API_KEY,
  voice: process.env.CARTESIA_VOICE_ID,
  version: process.env.CARTESIA_VERSION || '2026-08-14',
  tts: process.env.CARTESIA_TTS_MODEL || 'sonic-3.6',
  stt: process.env.CARTESIA_STT_MODEL || 'ink-whisper',
  lang: process.env.CARTESIA_LANGUAGE || 'nl',
};

if (!CART.key) fail('CARTESIA_API_KEY ontbreekt');
else if (!CART.voice) fail('CARTESIA_VOICE_ID ontbreekt');
else {
  try {
    const res = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'Cartesia-Version': CART.version,
        Authorization: `Bearer ${CART.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: CART.tts,
        transcript: 'Test.',
        language: CART.lang,
        voice: { id: CART.voice },
        output_format: { container: 'mp3', encoding: 'mp3', sample_rate: 44100, bit_rate: 128000 },
      }),
    });
    if (res.ok) {
      const bytes = (await res.arrayBuffer()).byteLength;
      ok(`TTS werkt — ${bytes} bytes audio met model ${CART.tts}`);
    } else {
      const detail = (await res.text()).slice(0, 200);
      fail(`TTS ${res.status}: ${detail}`);
      if (res.status === 401) console.log('     → sleutel klopt niet of is gerouleerd');
      if (res.status === 404) console.log('     → voice-id bestaat niet in dit account');
      if (res.status === 400) console.log(`     → check of model "${CART.tts}" nog bestaat op docs.cartesia.ai`);
    }
  } catch (err) { fail(`Cartesia onbereikbaar: ${err.message}`); }
}

head('Claude — brein');

if (!process.env.ANTHROPIC_API_KEY) skip('ANTHROPIC_API_KEY ontbreekt — BOB kan dan niet antwoorden, alleen data tonen');
else {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Zeg alleen: ok' }],
      }),
    });
    if (res.ok) ok(`Claude antwoordt (${process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'})`);
    else {
      const detail = (await res.text()).slice(0, 200);
      fail(`Claude ${res.status}: ${detail}`);
      if (res.status === 404) console.log('     → modelnaam bestaat niet; check platform.claude.com/docs/en/models/overview');
    }
  } catch (err) { fail(`Anthropic onbereikbaar: ${err.message}`); }
}

head('Connectoren');

if (!process.env.TODOIST_API_TOKEN) skip('Todoist: geen token');
else {
  const { fetchTasks } = await import('../server/connectors/todoist.js');
  try {
    const { tasks, via, pogingen } = await fetchTasks();
    ok(`Todoist werkt — ${tasks.length} open taken`);
    console.log(`     via ${via}`);
    // Ook bij succes tonen welke paden onderweg afvielen: dat maakt zichtbaar
    // wanneer Todoist weer een endpoint opheft, vóór het helemaal stukloopt.
    for (const p of pogingen) console.log(`     \x1b[90m${p.status || 'geen antwoord'} op ${p.url}\x1b[0m`);
  } catch (err) {
    fail('Todoist: geen van de endpoints werkte');
    // Per endpoint tonen wat er terugkwam. Alles op één hoop gooien leidt tot
    // "token verlopen" terwijl het in werkelijkheid een opgeheven pad is.
    for (const p of (err.pogingen || [])) {
      console.log(`     ${p.status || 'geen antwoord'}  ${p.url}`);
      console.log(`        \x1b[90m${p.body}\x1b[0m`);
    }
    const alles = (err.pogingen || []).map((p) => `${p.status} ${p.body}`).join(' ');
    if (/allowlist|proxy|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/i.test(alles)) {
      console.log('     → dit is je netwerk of proxy, niet je token');
    } else if (/\b401\b|\b403\b/.test(alles)) {
      console.log('     → Todoist weigert het token: Instellingen → Integraties → Ontwikkelaar → nieuw token');
      console.log('     → daarna:  bob set-secret TODOIST_API_TOKEN');
    }
  }
}

for (const [name, id, secret, secretVerplicht] of [
  ['Google', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', true],
  // Microsoft heeft géén secret nodig: de device code flow werkt met
  // alleen de client-ID. Een secret eisen zou die route uitsluiten.
  ['Microsoft', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', false],
]) {
  if (!process.env[id] || (secretVerplicht && !process.env[secret])) {
    skip(`${name}: geen OAuth-client ingesteld`);
    continue;
  }
  const slug = name.toLowerCase();
  const tokenFile = path.join(ROOT, 'data', 'tokens', `${slug}.json`);
  if (fs.existsSync(tokenFile)) { ok(`${name}: gekoppeld`); continue; }
  // Bewust geen localhost-link tonen: die werkt alleen als BOB dan draait,
  // en anders krijg je een onbereikbare pagina die op een storing lijkt.
  skip(`${name}: client ingesteld, nog niet gekoppeld`);
  console.log(`     → koppelen met:  \x1b[1mbob connect-${slug}\x1b[0m   (BOB hoeft daarvoor niet te draaien)`);
}

if (process.env.WHATSAPP_ENABLED === '1') {
  try {
    await import('whatsapp-web.js');
    ok('WhatsApp: aangezet en whatsapp-web.js aanwezig');
  } catch {
    fail('WhatsApp staat aan (WHATSAPP_ENABLED=1) maar whatsapp-web.js is niet geïnstalleerd');
    console.log('     → `npm install whatsapp-web.js qrcode-terminal`, of zet WHATSAPP_ENABLED=0 in .env');
  }
} else {
  skip('WhatsApp: uit');
}

head('Server');

try {
  const res = await fetch(`http://localhost:${process.env.PORT || 4321}/api/status`);
  res.ok ? ok('BOB-server draait') : fail(`BOB-server antwoordt met ${res.status}`);
} catch {
  skip('BOB-server draait nu niet — start hem met `bob` (dat hoeft niet voor het koppelen)');
}

// Staan er opvallend veel sleutels leeg, dan is de kans groot dat BOB uit een
// andere map draait dan waar je ze hebt ingevuld. Dat is de meest voorkomende
// oorzaak van "alles staat op niet gekoppeld".
const leeg = ['ANTHROPIC_API_KEY', 'TODOIST_API_TOKEN', 'GOOGLE_CLIENT_ID', 'MICROSOFT_CLIENT_ID']
  .filter((k) => !process.env[k]).length;

if (leeg >= 3) {
  console.log(`\n\x1b[33m  Veel sleutels leeg in ${path.join(ROOT, '.env')}\x1b[0m`);
  console.log('  Heb je ze elders wél ingevuld? Dan draait BOB uit de verkeerde map.');
  console.log('  Controleer met:  \x1b[1mbob env scan\x1b[0m   overnemen met:  \x1b[1mbob env import\x1b[0m');
}

console.log(
  failures
    ? `\n\x1b[31m${failures} probleem${failures === 1 ? '' : 'en'} gevonden.\x1b[0m Zie INSTALL.md voor de bijbehorende stap.\n`
    : '\n\x1b[32mAlles wat ingesteld is, werkt.\x1b[0m\n'
);
process.exit(failures ? 1 : 0);
