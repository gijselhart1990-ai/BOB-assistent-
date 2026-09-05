#!/usr/bin/env node
/**
 * `bob demo off`  /  `bob demo on`  /  `bob demo`
 *
 * Zet BOB_DEMO in .env. Demomodus vult het dashboard met voorbeelddata;
 * met demomodus aan zie je nooit je eigen agenda, mail of taken, hoeveel
 * sleutels je ook invult.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = path.join(ROOT, '.env');

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

if (!fs.existsSync(ENV)) {
  console.error(`\n  Geen .env gevonden in ${ROOT}\n`);
  process.exit(1);
}

const raw = fs.readFileSync(ENV, 'utf8');
const current = /^BOB_DEMO=(.*)$/m.exec(raw)?.[1] ?? '0';
const isOn = ['1', 'true', 'yes', 'ja', 'on'].includes(current.trim().toLowerCase());

const arg = (process.argv[2] || '').toLowerCase();

if (!arg) {
  console.log(`\n  Demomodus staat ${isOn ? yellow('AAN') : green('UIT')}.`);
  console.log(isOn
    ? '  Je ziet voorbeelddata, niet je eigen agenda en taken.\n  Uitzetten met:  bob demo off\n'
    : '  Je ziet je eigen data.\n');
  process.exit(0);
}

if (!['on', 'off', 'aan', 'uit'].includes(arg)) {
  console.error('\n  Gebruik: bob demo [on|off]\n');
  process.exit(1);
}

const want = arg === 'on' || arg === 'aan' ? '1' : '0';
const lines = raw.split(/\r?\n/);
let found = false;
const out = lines.map((l) => {
  if (l.startsWith('BOB_DEMO=')) { found = true; return `BOB_DEMO=${want}`; }
  return l;
});
if (!found) out.push(`BOB_DEMO=${want}`);

fs.writeFileSync(ENV, out.join('\n'), 'utf8');

console.log(want === '1'
  ? `\n  ${yellow('Demomodus AAN')} — het dashboard toont voorbeelddata.`
  : `\n  ${green('Demomodus UIT')} — je ziet nu je eigen agenda, mail en taken.`);
console.log('  Herstart BOB om het te laden.\n');
