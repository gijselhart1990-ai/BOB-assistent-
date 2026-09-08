#!/usr/bin/env node
/**
 * Alles klaarzetten: opruimen, installeren, een verse .env, en pushen.
 *
 *   node scripts/klaarzetten.mjs            alles
 *   node scripts/klaarzetten.mjs --geen-git alleen opruimen en installeren
 *
 * Dit stond eerder in een .cmd-bestand. Dat is nu Node, om een concrete
 * reden: de controle "staat .env wel in .gitignore" gebeurde daar met
 * findstr, en findstr splitst geen regels in een bestand met Unix-regel-
 * einden. Onze .gitignore heeft die, want git staat hier op autocrlf false.
 * Dus zag findstr één lange regel, vond hij .env niet, en stopte het script
 * op een probleem dat niet bestond. In Node is dat één splitsing op \n en
 * kan ik het hier testen voordat jij het draait.
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const WORTEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GEEN_GIT = process.argv.includes('--geen-git');

/**
 * Git opzoeken in plaats van hopen dat hij op het PATH staat.
 *
 * Git for Windows wordt vaak per gebruiker geïnstalleerd, en dan kent niet elk
 * venster het commando: een PowerShell dat al openstond vóór de installatie
 * heeft het oude PATH nog. Dat kostte hier een avond zoeken naar een push die
 * niet gebeurde. Dus kijken we zelf op de plekken waar hij kan staan.
 */
function vindGit() {
  if (process.env.BOB_GIT) return process.env.BOB_GIT;

  const kandidaten = process.platform === 'win32'
    ? [
        join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'cmd', 'git.exe'),
        join(process.env.ProgramFiles || '', 'Git', 'cmd', 'git.exe'),
        join(process.env['ProgramFiles(x86)'] || '', 'Git', 'cmd', 'git.exe'),
        join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'git.exe'),
        join(process.env.USERPROFILE || '', 'scoop', 'shims', 'git.exe'),
      ]
    : [];

  // Eerst het PATH: staat hij daar, dan is dat de versie die de gebruiker zelf
  // ook krijgt, en dat is de minst verrassende keuze.
  try {
    execFileSync('git', ['--version'], { stdio: 'pipe' });
    return 'git';
  } catch { /* niet op het PATH; verder zoeken */ }

  return kandidaten.find((p) => p && existsSync(p)) || 'git';
}

const GIT = vindGit();

const REPO = 'https://github.com/gijselhart1990-ai/BOB-assistent-.git';

let stap = 0;
/**
 * Alles wat hier gebeurt gaat ook naar klaarzetten-log.txt.
 *
 * Reden: als dit venster dichtvalt of je scrollt eroverheen, is de enige
 * plek waar de echte foutmelding stond weg — en dan zoeken we samen naar
 * iets wat er wél stond. Nu staat het op schijf en kun je het doorsturen.
 * In dit log komen geen sleutels: het script leest je .env niet.
 */
const LOG = join(WORTEL, 'klaarzetten-log.txt');
const logRegels = [`=== klaarzetten — ${new Date().toISOString()} ===`, `map: ${WORTEL}`, `node: ${process.version}`];

function schrijfLog() {
  try { writeFileSync(LOG, `${logRegels.join('\n')}\n`, 'utf8'); } catch { /* log is nooit belangrijker dan de taak */ }
}
process.on('exit', schrijfLog);

function zeg(regel) {
  console.log(regel);
  logRegels.push(regel);
}
/** Wel in het log, niet op het scherm — voor ruwe uitvoer van commando's. */
const stilLog = (regel) => logRegels.push(regel);

const kop = (t) => zeg(`\n  ${++stap}. ${t}\n  ${'-'.repeat(58)}`);
const ok = (t) => zeg(`  [v] ${t}`);
const info = (t) => zeg(`      ${t}`);

function stop(waarom, wat) {
  zeg(`\n  [X] ${waarom}\n`);
  if (wat) zeg(`      ${wat}\n`);
  zeg(`  Het volledige verslag staat in klaarzetten-log.txt`);
  process.exit(1);
}

function draai(cmd, args, opties = {}) {
  return execFileSync(cmd, args, {
    cwd: WORTEL, encoding: 'utf8', stdio: opties.stil ? 'pipe' : 'inherit', ...opties,
  });
}

/**
 * npm starten, en dat is op Windows lastiger dan het hoort.
 *
 * `npm` is daar `npm.cmd`, een batchbestand. Sinds Node 20.12 weigert
 * child_process een .cmd of .bat rechtstreeks te starten — dat was een
 * beveiligingsfix, want de argumenten gingen langs de shell. Het gevolg is
 * dat execFileSync('npm.cmd', ...) meteen gooit, zonder één regel uitvoer.
 * Precies wat er hier misging.
 *
 * De nette uitweg is npm's eigen JavaScript aanroepen met dezelfde node die
 * dit script draait. Dat gaat langs geen enkele shell en werkt op alle
 * platformen gelijk. Lukt het vinden niet, dan valt hij terug op de shell.
 */
function npmCli() {
  const naast = dirname(process.execPath);
  const kandidaten = [
    join(naast, 'node_modules', 'npm', 'bin', 'npm-cli.js'),            // Windows
    join(naast, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'), // Linux/macOS
  ];
  return kandidaten.find((p) => existsSync(p)) || null;
}

function npmDraai(args) {
  const cli = npmCli();
  if (cli) return draai(process.execPath, [cli, ...args]);
  // Terugval: via de shell, want anders start .cmd helemaal niet.
  return draai(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { shell: true });
}

function stil(cmd, args) {
  try {
    const uit = execFileSync(cmd, args, { cwd: WORTEL, encoding: 'utf8', stdio: 'pipe' }).trim();
    stilLog(`$ ${cmd} ${args.join(' ')}\n  -> ok${uit ? `: ${uit.split('\n').slice(0, 8).join('\n     ')}` : ''}`);
    return { ok: true, uit };
  } catch (err) {
    const uit = `${err.stdout || ''}${err.stderr || ''}`.trim() || err.message;
    stilLog(`$ ${cmd} ${args.join(' ')}\n  -> MISLUKT: ${uit.split('\n').slice(0, 12).join('\n     ')}`);
    return { ok: false, uit };
  }
}

console.log('\n  BOB klaarzetten');
console.log('  ============================================================');

/* ---------------- 1. staan we in de goede map? ---------------- */

kop('Controleren of de nieuwe versie is uitgepakt');

if (!existsSync(join(WORTEL, 'package.json'))) {
  stop('Dit is geen bob-web-map.', 'Draai dit script vanuit de map waar package.json staat.');
}
// Dit bestand bestaat alleen in de Xano-versie. Zit het er niet, dan is het
// zip niet uitgepakt en zou de rest van dit script de oude code opruimen.
if (!existsSync(join(WORTEL, 'scripts', 'env-doctor.mjs'))) {
  stop('De nieuwe versie is niet uitgepakt.', 'Pak BOB-web-xano.zip uit over deze map en probeer het opnieuw.');
}
ok('de Xano-versie staat er');

/* ---------------- 2. oude bestanden weg ---------------- */

kop('Oude Supabase-bestanden opruimen');

// Uitpakken overschrijft wel, maar verwijdert nooit. Deze verwijzen naar
// Supabase, dat niet meer in package.json staat: laat je ze staan, dan faalt
// de build van Netlify op een typefout in code die nergens meer gebruikt wordt.
const WEG = ['lib/supabase', 'lib/oauthState.ts', 'supabase', 'bob-web'];
let opgeruimd = 0;
for (const pad of WEG) {
  const vol = join(WORTEL, pad);
  if (!existsSync(vol)) continue;
  try { rmSync(vol, { recursive: true, force: true }); opgeruimd++; info(`weg: ${pad}`); }
  catch (err) { stop(`Kan ${pad} niet verwijderen: ${err.message}`, 'Staat er nog een venster of editor open in die map?'); }
}
ok(opgeruimd ? `${opgeruimd} opgeruimd` : 'er stond niets ouds meer');

/* ---------------- 3. .gitignore ---------------- */

kop('Controleren dat .env buiten de repo blijft');

const giPad = join(WORTEL, '.gitignore');
const gi = existsSync(giPad) ? readFileSync(giPad, 'utf8') : '';
const giRegels = gi.split(/\r?\n/).map((r) => r.trim());
const MOET = ['.env', '.env.local', '.env.oud-*'];
const missen = MOET.filter((m) => !giRegels.includes(m));

if (missen.length) {
  writeFileSync(giPad, `${gi.replace(/\s*$/, '')}\n${missen.join('\n')}\n`, 'utf8');
  ok(`toegevoegd aan .gitignore: ${missen.join(', ')}`);
} else {
  ok('.gitignore dekt .env, .env.local en de reservekopieën');
}

/* ---------------- 4. installeren ---------------- */

kop('Pakketten installeren (dit duurt even)');

if (existsSync(join(WORTEL, 'node_modules', 'next'))) {
  ok('node_modules staat er al — overslaan');
  info('opnieuw installeren? verwijder de map node_modules en draai dit nog eens');
} else {
  try {
    npmDraai(['install', '--no-audit', '--no-fund']);
    ok('geïnstalleerd');
  } catch (err) {
    // De melding van npm zelf erbij: zonder dat staat er alleen "mislukt" en
    // weet je nog niets. Vorige versie deed precies dat.
    stop(`npm install is mislukt: ${err.message}`,
      'Staat er hierboven uitvoer van npm, dan is dat de echte reden.\n' +
      '      Zo niet, draai dan eens met de hand in deze map:  npm install');
  }
}

/* ---------------- 5. .env ---------------- */

kop('Omgevingsvariabelen');

const envPad = join(WORTEL, '.env');
if (existsSync(envPad)) {
  ok('er staat al een .env — die laat ik met rust');
  info('een verse maken (met de oude als reservekopie ernaast):');
  info('    npm run env -- --nieuw');
} else {
  const geheim = (n) => randomBytes(n).toString('base64url');
  const sjabloon = readFileSync(join(WORTEL, '.env.example'), 'utf8')
    .replace(/^BOB_SESSION_SECRET=.*$/m, `BOB_SESSION_SECRET=${geheim(48)}`)
    .replace(/^BOB_LOGIN_CODE=.*$/m, `BOB_LOGIN_CODE=${geheim(24)}`)
    .replace(/^BOB_ALLOWED_EMAILS=.*$/m, 'BOB_ALLOWED_EMAILS=gijselhart1990@gmail.com')
    .replace(/^NEXT_PUBLIC_SITE_URL=.*$/m, 'NEXT_PUBLIC_SITE_URL=http://localhost:3000');
  writeFileSync(envPad, sjabloon, 'utf8');
  ok('.env aangemaakt');
  info('BOB_SESSION_SECRET en BOB_LOGIN_CODE zijn hier op jouw machine');
  info('gemaakt en zijn nergens anders geweest.');
}

/* ---------------- 6. git ---------------- */

if (GEEN_GIT) {
  zeg('\n  (git overgeslagen)\n');
} else {
  kop('De repo opschonen en pushen');

  const v = stil(GIT, ['--version']);
  if (!v.ok) {
    stop(`Git werkt niet (geprobeerd: ${GIT}).`,
      'Is Git net geïnstalleerd? Sluit dit venster en open een nieuw —\n' +
      '      een venster dat al openstond kent het nieuwe PATH niet.\n' +
      '      Nog niet geïnstalleerd: https://git-scm.com/download/win');
  }
  ok(`${v.uit}${GIT === 'git' ? '' : `  (${GIT})`}`);

  if (!existsSync(join(WORTEL, '.git'))) {
    draai(GIT, ['init', '-q'], { stil: true });
    ok('git-repo aangemaakt');
  }

  // Een half afgemaakte samenvoeging van een eerdere poging opruimen.
  stil(GIT, ['rebase', '--abort']);
  stil(GIT, ['merge', '--abort']);

  stil(GIT, ['config', 'core.autocrlf', 'false']);
  if (!stil(GIT, ['config', 'user.name']).ok) stil(GIT, ['config', 'user.name', 'Sander']);
  if (!stil(GIT, ['config', 'user.email']).ok) stil(GIT, ['config', 'user.email', 'gijselhart1990@gmail.com']);

  // Een tak zonder ouders: de oude geschiedenis, met je .env erin, komt niet
  // mee. rm --cached is daarbij het punt waar het om draait — .env was een
  // BIJGEHOUDEN bestand, en dan telt .gitignore niet meer. Uit de index halen
  // laat hem gewoon op je schijf staan.
  const tak = `schoon-${Date.now().toString(36)}`;
  const orphan = stil(GIT, ['checkout', '--orphan', tak]);
  if (!orphan.ok) stop(`Kan geen schone tak maken: ${orphan.uit}`);

  // `git rm -r --cached .` leek hier de logische stap, maar die weigert zodra
  // er iets in de index staat dat afwijkt van zowel het bestand als HEAD —
  // precies wat een eerder afgebroken poging achterlaat. Mislukte hij, dan
  // bleef .env bijgehouden en sloeg de controle hieronder terecht alarm.
  //
  // read-tree --empty maakt de index onvoorwaardelijk leeg en laat je
  // bestanden met rust. Daarna geldt .gitignore weer voor alles.
  const leeg = stil(GIT, ['read-tree', '--empty']);
  if (!leeg.ok) stop(`Kan de index niet leegmaken: ${leeg.uit}`);
  stil(GIT, ['add', '-A']);

  // De controle die de vorige keer ontbrak: niet kijken wat er nieuw bijkomt,
  // maar naar de complete inhoud van de commit.
  const inhoud = stil(GIT, ['diff', '--cached', '--name-only']).uit.split('\n').filter(Boolean);
  const lek = inhoud.filter((p) => /(^|\/)\.env(\.local)?$/.test(p) || /(^|\/)\.env\.oud-/.test(p));
  if (lek.length) {
    // Niet terugspringen naar main: dat lukt toch niet met een volle index en
    // laat de repo rommeliger achter dan hij was. Alleen de index legen, zodat
    // een volgende poging schoon begint.
    stil(GIT, ['read-tree', '--empty']);
    stop(`Er zit een geheim bestand in de commit: ${lek.join(', ')}`,
      'Er is niets gepusht. Controleer of .gitignore die regel bevat.');
  }
  ok(`geen .env in de commit (${inhoud.length} bestanden)`);

  const commit = stil(GIT, ['commit', '-q', '-m',
    'BOB als privewebsite: Next.js, Xano en een brug naar mijn laptop', '-m',
    'Xano is alleen database; de wachtrij naar de laptop staat in Netlify Blobs. Inloggen gaat met een ondertekend cookie en een eenmalige maillink, zonder externe auth-dienst.']);
  if (!commit.ok && !/nothing to commit/i.test(commit.uit)) stop(`Committen mislukt: ${commit.uit}`);
  ok('schone commit gemaakt');

  stil(GIT, ['branch', '-D', 'main']);
  stil(GIT, ['branch', '-m', 'main']);

  // Losse takken van eerdere mislukte pogingen opruimen. Kan pas nu: je kunt
  // de tak waar je zelf op staat niet verwijderen.
  const oude = stil(GIT, ['branch', '--list', 'schoon-*']).uit
    .split('\n').map((r) => r.replace(/^[*+]?\s*/, '').trim()).filter(Boolean);
  for (const t of oude) stil(GIT, ['branch', '-D', t]);
  if (oude.length) info(`${oude.length} tak(ken) van eerdere pogingen opgeruimd`);
  if (!stil(GIT, ['remote', 'get-url', 'origin']).ok) stil(GIT, ['remote', 'add', 'origin', REPO]);
  else stil(GIT, ['remote', 'set-url', 'origin', REPO]);

  zeg('\n      pushen — vraagt hij om in te loggen, doe dat in het venster dat opent\n');
  // Via stil() en niet via draai(): dan komt de uitvoer van git óók in het
  // log. Zonder dat stond de reden waarom een push mislukte alleen in een
  // venster dat daarna dichtging.
  const push = stil(GIT, ['push', '--force', '-u', 'origin', 'main']);
  zeg(push.uit.split('\n').map((r) => `      ${r}`).join('\n'));
  if (!push.ok) {
    stop('Pushen is mislukt.',
      'Hierboven staat wat git ervan zegt. Meestal: nog niet ingelogd bij\n' +
      '      GitHub, geen schrijfrechten, of branch protection op main.');
  }
  ok('gepusht: één schone commit, geen geschiedenis met je .env erin');

  const na = stil(GIT, ['rev-parse', '--short', 'HEAD']);
  if (na.ok) info(`commit ${na.uit} staat nu op origin/main`);
}

/* ---------------- klaar ---------------- */

zeg(`
  ============================================================
  Klaar met opruimen en installeren.

  Nu de sleutels. Open .env in deze map en vul ze in — welke,
  en waar je ze haalt, staat in SLEUTELS.md.

  Controleren doe je met:

      npm run env

  Dat belt elke dienst één keer op en zegt per sleutel of hij
  werkt. Sleutels worden gemaskeerd afgedrukt, dus die uitvoer
  kun je delen.

  Verslag van deze run: klaarzetten-log.txt
  ============================================================
`);
