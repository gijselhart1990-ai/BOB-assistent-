#!/usr/bin/env node
/**
 * `node scripts/set-secret.js [NAAM]`
 *
 * Zet één waarde veilig in je .env. Vraagt hem via een prompt in plaats van
 * hem op de commandoregel te zetten, zodat:
 *   - de sleutel niet in je PowerShell-geschiedenis belandt;
 *   - PowerShell hem niet verminkt (in `-replace` heeft $ een speciale
 *     betekenis, wat stilzwijgend tekens uit je secret sloopt);
 *   - je .env niet per ongeluk als .env.txt wordt opgeslagen.
 *
 * Zonder argument krijg je een lijstje om uit te kiezen.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = path.join(ROOT, '.env');

const KEYS = [
  'CARTESIA_API_KEY', 'CARTESIA_VOICE_ID',
  'ANTHROPIC_API_KEY', 'TODOIST_API_TOKEN',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET',
];

if (!fs.existsSync(ENV)) {
  console.error(`\n  Geen .env gevonden in ${ROOT}\n  Kopieer eerst .env.example naar .env.\n`);
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

let key = process.argv[2];

if (!key) {
  console.log('\n  Welke wil je instellen?\n');
  KEYS.forEach((k, i) => console.log(`    ${String(i + 1).padStart(2)}. ${k}`));
  const answer = (await ask('\n  Nummer of naam: ')).trim();
  key = /^\d+$/.test(answer) ? KEYS[Number(answer) - 1] : answer.toUpperCase();
}

if (!key || !/^[A-Z0-9_]+$/.test(key)) {
  console.error('\n  Ongeldige naam.\n');
  rl.close();
  process.exit(1);
}

const value = (await ask(`\n  Plak de waarde voor ${key}\n  > `)).trim();
rl.close();

if (!value) {
  console.error('\n  Niets ingevuld, .env is niet aangepast.\n');
  process.exit(1);
}

if (/^["'].*["']$/.test(value)) {
  console.log('\n  Let op: aanhalingstekens eromheen worden meegenomen als deel van de waarde.');
  console.log('  Ik haal ze er niet automatisch af — controleer of dat klopt.\n');
}

const raw = fs.readFileSync(ENV, 'utf8');
const lines = raw.split(/\r?\n/);
let replaced = false;

// Regel voor regel vergelijken, niet met een regex over de waarde —
// zo kan geen enkel teken in je secret iets bijzonders betekenen.
const out = lines.map((line) => {
  if (line.startsWith(`${key}=`)) { replaced = true; return `${key}=${value}`; }
  return line;
});

if (!replaced) out.push(`${key}=${value}`);

fs.writeFileSync(ENV, out.join('\n'), 'utf8');

console.log(`\n  ${key} is ${replaced ? 'bijgewerkt' : 'toegevoegd'} (${value.length} tekens).`);
console.log('  Herstart BOB om het te laden.\n');
