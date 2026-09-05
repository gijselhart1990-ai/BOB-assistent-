#!/usr/bin/env node
/**
 * `bob env`            welke .env gebruikt deze BOB, en wat staat erin
 * `bob env scan`       zoekt andere BOB-installaties op deze computer
 * `bob env import`     neemt de meest complete .env (en tokens) over
 *
 * Waarom dit bestaat: meerdere uitgepakte kopieën naast elkaar is de
 * makkelijkste manier om jezelf voor de gek te houden. Je vult sleutels in
 * map A, start BOB vanuit map B, en alles staat op "niet gekoppeld".
 * Dit gereedschap maakt dat in één oogopslag zichtbaar.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = path.join(ROOT, '.env');

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[90m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const KEYS = [
  'CARTESIA_API_KEY', 'CARTESIA_VOICE_ID', 'ANTHROPIC_API_KEY', 'TODOIST_API_TOKEN',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET',
];

function parseEnv(file) {
  try {
    const out = {};
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].trim();
    }
    return out;
  } catch { return null; }
}

const filled = (env) => KEYS.filter((k) => env?.[k]);

/** Zoekt BOB-installaties: mappen met server/index.js én package.json "bob". */
function findInstalls() {
  const roots = [os.homedir()];
  const found = [];
  const seen = new Set();

  const walk = (dir, depth) => {
    if (depth > 5 || found.length > 40) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    if (entries.some((e) => e.name === 'package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        if (pkg.name === 'bob' && fs.existsSync(path.join(dir, 'server', 'index.js'))) {
          const real = fs.realpathSync(dir);
          if (!seen.has(real)) { seen.add(real); found.push(dir); }
          return; // niet verder in een gevonden installatie zoeken
        }
      } catch { /* geen geldige package.json */ }
    }

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (['node_modules', '.git', '.cache', 'AppData', '.wwebjs_auth'].includes(e.name)) continue;
      if (e.name.startsWith('.') && e.name !== '.') continue;
      walk(path.join(dir, e.name), depth + 1);
    }
  };

  for (const r of roots) walk(r, 0);
  return found;
}

function describe(dir) {
  const env = parseEnv(path.join(dir, '.env'));
  const tokens = ['google', 'microsoft']
    .filter((p) => fs.existsSync(path.join(dir, 'data', 'tokens', `${p}.json`)));
  return {
    dir,
    env,
    keys: filled(env),
    tokens,
    node_modules: fs.existsSync(path.join(dir, 'node_modules')),
    score: filled(env).length * 2 + tokens.length * 3,
    isMe: path.resolve(dir) === path.resolve(ROOT),
  };
}

const cmd = (process.argv[2] || 'show').toLowerCase();

/* ---------------- show ---------------- */

if (cmd === 'show') {
  const env = parseEnv(ENV);
  console.log(`\n  ${bold('Deze BOB draait uit:')}`);
  console.log(`    ${ROOT}`);
  console.log(`  ${bold('Leest configuratie uit:')}`);
  console.log(`    ${ENV}  ${env ? green('(gevonden)') : red('(BESTAAT NIET)')}\n`);

  if (!env) {
    console.log(`  Maak hem aan:  copy .env.example .env`);
    console.log(`  Of neem een bestaande over:  bob env import\n`);
    process.exit(1);
  }

  const demo = ['1', 'true', 'ja', 'on'].includes(String(env.BOB_DEMO || '').toLowerCase());
  if (demo) console.log(`  ${yellow('BOB_DEMO=1')} — je ziet voorbeelddata, niet je eigen gegevens.\n`);

  for (const k of KEYS) {
    const v = env[k];
    console.log(`    ${v ? green('●') : dim('○')} ${k.padEnd(24)} ${v ? dim(`${v.length} tekens`) : dim('leeg')}`);
  }
  const tokens = ['google', 'microsoft'].filter((p) => fs.existsSync(path.join(ROOT, 'data', 'tokens', `${p}.json`)));
  console.log(`\n    ${tokens.length ? green('●') : dim('○')} Ingelogd bij: ${tokens.length ? tokens.join(', ') : dim('nog niets')}`);
  console.log(`\n  ${dim('Andere kopieën zoeken:  bob env scan')}\n`);
  process.exit(0);
}

/* ---------------- scan / import ---------------- */

console.log(`\n  Zoeken naar BOB-installaties onder ${os.homedir()} ...`);
const installs = findInstalls().map(describe).sort((a, b) => b.score - a.score);

if (installs.length <= 1) {
  console.log(`\n  ${green('Eén installatie gevonden.')} Geen dubbele kopieën om te verwarren.\n`);
  process.exit(0);
}

console.log(`\n  ${yellow(`${installs.length} installaties gevonden.`)} Meest compleet bovenaan:\n`);
installs.forEach((i, n) => {
  const tag = i.isMe ? green('  <- deze draait nu') : '';
  console.log(`   ${n + 1}. ${i.dir}${tag}`);
  console.log(`      ${i.keys.length}/${KEYS.length} sleutels`
    + `, ingelogd bij: ${i.tokens.length ? i.tokens.join(' + ') : 'niets'}`
    + `, ${i.node_modules ? 'geïnstalleerd' : dim('geen node_modules')}`);
});

const me = installs.find((i) => i.isMe);
const best = installs[0];

if (best.isMe) {
  console.log(`\n  ${green('Deze installatie is al de meest complete.')}`);
  console.log(`  ${dim('Ruim de andere op zodra je zeker weet dat je ze niet meer nodig hebt.')}\n`);
  process.exit(0);
}

console.log(`\n  ${yellow('De installatie die nu draait is niet de meest complete.')}`);
console.log(`  Nu:    ${me?.keys.length ?? 0} sleutels, ingelogd bij ${me?.tokens.join(' + ') || 'niets'}`);
console.log(`  Beter: ${best.keys.length} sleutels, ingelogd bij ${best.tokens.join(' + ') || 'niets'}`);
console.log(`         ${best.dir}`);

if (cmd !== 'import') {
  console.log(`\n  Overnemen met:  ${bold('bob env import')}\n`);
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise((r) => rl.question(`\n  .env en logins hiervandaan overnemen? (j/n) `, r));
rl.close();

if (!/^(j|ja|y|yes)$/i.test(answer.trim())) {
  console.log('\n  Niets gewijzigd.\n');
  process.exit(0);
}

// Back-up van wat er nu staat, daarna overnemen.
if (fs.existsSync(ENV)) {
  const backup = `${ENV}.backup-${Date.now()}`;
  fs.copyFileSync(ENV, backup);
  console.log(`\n  Back-up van je huidige .env: ${path.basename(backup)}`);
}

fs.copyFileSync(path.join(best.dir, '.env'), ENV);
console.log(`  .env overgenomen uit ${path.basename(path.dirname(best.dir))}/${path.basename(best.dir)} (${best.keys.length} sleutels).`);

// Logins uit álle kopieën samenvoegen, niet alleen uit de bron van de .env.
// De volste .env en de geldige login staan zelden in dezelfde map.
const dstTokens = path.join(ROOT, 'data', 'tokens');
const nieuwste = new Map(); // provider -> { src, mtime }

for (const inst of installs) {
  const dir = path.join(inst.dir, 'data', 'tokens');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const src = path.join(dir, f);
    const mtime = fs.statSync(src).mtimeMs;
    const prev = nieuwste.get(f);
    if (!prev || mtime > prev.mtime) nieuwste.set(f, { src, mtime });
  }
}

if (nieuwste.size) {
  fs.mkdirSync(dstTokens, { recursive: true });
  for (const [f, { src }] of nieuwste) {
    if (path.resolve(src) === path.resolve(path.join(dstTokens, f))) continue;
    fs.copyFileSync(src, path.join(dstTokens, f));
    console.log(`  Login overgenomen: ${f.replace('.json', '')}  ${dim(path.dirname(path.dirname(path.dirname(src))))}`);
  }
} else {
  console.log(dim('  Geen bestaande logins gevonden — Google en Outlook koppel je opnieuw.'));
}

console.log(`\n  ${green('Klaar.')} Controleer met:  bob doctor\n`);
