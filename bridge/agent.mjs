#!/usr/bin/env node
/**
 * BOB-bridge — het programma dat op jouw laptop draait.
 *
 * De website staat in de cloud en kan daar geen browservenster openen of
 * WhatsApp Web aansturen. Jouw laptop kan dat wel, maar is van buitenaf niet
 * bereikbaar: hij zit achter een router, een firewall en een IP dat verandert.
 *
 * Daarom draait het verkeer één kant op. Dit programma vraagt elke seconde
 * aan de website "is er werk voor mij?", voert uit wat er klaarstaat en stuurt
 * het antwoord terug. Er hoeft niets opengezet te worden op je router, en er
 * is geen enkel moment waarop iemand van buiten iets naar je laptop kan sturen.
 *
 * Grenzen die hier hard in zitten, niet als instelling:
 *   - Klikken en typen komen pas binnen nádat jij in het dashboard akkoord
 *     hebt gegeven. Dit programma krijgt zo'n opdracht anders niet te zien.
 *   - Wachtwoord-, pincode- en betaalvelden worden geweigerd. Altijd.
 *   - WhatsApp wordt alleen gelezen. Er zit geen verstuurfunctie in.
 *
 * Starten:  node bridge/agent.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HIER, 'data');

/* ---------------- instellingen ---------------- */

laadEnv(path.join(HIER, '.env'));

const SITE = (process.env.BOB_SITE_URL || '').replace(/\/$/, '');
const TOKEN = process.env.BOB_BRIDGE_TOKEN || '';
const VERSIE = '2.0.0';

if (!SITE || !TOKEN) {
  console.error(`
  BOB-bridge kan niet starten.

  Maak een bestand  bridge/.env  met daarin:

      BOB_SITE_URL=https://jouw-bob.netlify.app
      BOB_BRIDGE_TOKEN=bob_...

  Het token maak je aan in het dashboard onder Instellingen → Je laptop.
`);
  process.exit(1);
}

/* ---------------- kleine helpers ---------------- */

function laadEnv(bestand) {
  if (!fs.existsSync(bestand)) return;
  for (const regel of fs.readFileSync(bestand, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(regel);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const groen = (s) => `\x1b[32m${s}\x1b[0m`;
const grijs = (s) => `\x1b[90m${s}\x1b[0m`;
const rood = (s) => `\x1b[31m${s}\x1b[0m`;

async function api(pad, init = {}) {
  const res = await fetch(`${SITE}/api/bridge${pad}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const tekst = await res.text();
  let data = {};
  try { data = JSON.parse(tekst); } catch { /* geen JSON */ }
  if (!res.ok) throw new Error(data.error || `${res.status} op ${pad}`);
  return data;
}

/* ---------------- browser ---------------- */

const PROFIEL = path.join(DATA, 'browser-profile');
let context = null;
let page = null;

function vindBrowser() {
  if (process.env.BOB_BROWSER_PATH) {
    return fs.existsSync(process.env.BOB_BROWSER_PATH) ? process.env.BOB_BROWSER_PATH : null;
  }
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const local = process.env.LOCALAPPDATA || '';
  const kandidaten = process.platform === 'win32' ? [
    path.join(pf, 'Google/Chrome/Application/chrome.exe'),
    path.join(pf86, 'Google/Chrome/Application/chrome.exe'),
    path.join(local, 'Google/Chrome/Application/chrome.exe'),
    path.join(pf86, 'Microsoft/Edge/Application/msedge.exe'),
    path.join(pf, 'Microsoft/Edge/Application/msedge.exe'),
  ] : [
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return kandidaten.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || null;
}

async function zorgVoorPagina() {
  if (page && !page.isClosed()) return page;

  const exe = vindBrowser();
  if (!exe) throw new Error('Geen Chrome of Edge gevonden. Zet BOB_BROWSER_PATH in bridge/.env.');

  let chromium;
  try { ({ chromium } = await import('playwright-core')); }
  catch { throw new Error('playwright-core ontbreekt. Draai in de bridge-map:  npm install playwright-core'); }

  fs.mkdirSync(PROFIEL, { recursive: true });
  context = await chromium.launchPersistentContext(PROFIEL, {
    executablePath: exe,
    headless: false,              // bewust zichtbaar: je moet kunnen ingrijpen
    viewport: { width: 1280, height: 900 },
    locale: 'nl-NL',
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  context.on('close', () => { context = null; page = null; });
  page = context.pages()[0] || await context.newPage();
  return page;
}

// Harde grens, geen instelling.
const VERBODEN_VELD = /pass|wachtwoord|pincode|pin|cvc|cvv|iban|creditcard|card.?number|kaartnummer|security.?code|otp|2fa|verificatiecode/i;

const BROWSER = {
  async browser_status() {
    return { draait: Boolean(context), profiel: PROFIEL, browser: vindBrowser() };
  },
  async browser_goto({ url }) {
    const p = await zorgVoorPagina();
    const doel = new URL(String(url));
    if (!['http:', 'https:'].includes(doel.protocol)) throw new Error('Alleen http en https.');
    await p.goto(doel.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await p.waitForTimeout(600);
    return { url: p.url(), title: await p.title() };
  },
  async browser_read() {
    const p = await zorgVoorPagina();
    const tekst = await p.evaluate(() => {
      const kloon = document.body.cloneNode(true);
      ['script', 'style', 'noscript', 'svg', 'nav', 'footer']
        .forEach((sel) => kloon.querySelectorAll(sel).forEach((el) => el.remove()));
      return (kloon.innerText || '').replace(/\n{3,}/g, '\n\n').slice(0, 12000);
    });
    return { url: p.url(), title: await p.title(), text: tekst };
  },
  async browser_elements() {
    const p = await zorgVoorPagina();
    return p.evaluate(() => {
      const zichtbaar = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      const uit = [];
      document.querySelectorAll('button, a[href], input, textarea, select, [role="button"]').forEach((el, i) => {
        if (!zichtbaar(el) || uit.length >= 60) return;
        const label = (el.innerText || el.value || el.getAttribute('aria-label') ||
          el.getAttribute('placeholder') || el.getAttribute('title') || '').trim().slice(0, 70);
        if (!label && el.tagName !== 'INPUT') return;
        uit.push({ i, soort: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', label, naam: el.getAttribute('name') || el.id || '' });
      });
      return uit;
    });
  },
  async browser_screenshot() {
    const p = await zorgVoorPagina();
    const png = await p.screenshot({ type: 'png', fullPage: false });
    return { png: Buffer.from(png).toString('base64'), url: p.url() };
  },
  async browser_close() {
    try { await context?.close(); } catch { /* al dicht */ }
    context = null; page = null;
    return { gesloten: true };
  },

  // Deze drie bereiken dit programma alleen ná jouw akkoord in het dashboard.
  async browser_click({ element }) {
    const p = await zorgVoorPagina();
    const doel = String(element || '').trim();
    if (!doel) throw new Error('Geen element opgegeven.');
    await p.getByRole('button', { name: doel, exact: false })
      .or(p.getByRole('link', { name: doel, exact: false }))
      .or(p.getByText(doel, { exact: false }))
      .first()
      .click({ timeout: 10_000 });
    await p.waitForTimeout(800);
    return { uitgevoerd: true, url: p.url(), title: await p.title() };
  },
  async browser_type({ field, text }) {
    const p = await zorgVoorPagina();
    const naam = String(field || '').trim();
    if (VERBODEN_VELD.test(naam)) {
      return { uitgevoerd: false, reden: `BOB vult geen ${naam}-velden in. Doe dat zelf in het venster.` };
    }
    const isWachtwoord = await p.evaluate((n) => {
      const el = document.querySelector(`input[name*="${n}" i], input[placeholder*="${n}" i], input[aria-label*="${n}" i]`);
      return el ? el.type === 'password' : false;
    }, naam).catch(() => false);
    if (isWachtwoord) return { uitgevoerd: false, reden: 'Dat is een wachtwoordveld. Dat vult BOB nooit in.' };

    await p.getByLabel(naam, { exact: false })
      .or(p.getByPlaceholder(naam, { exact: false }))
      .or(p.locator(`input[name*="${naam}" i], textarea[name*="${naam}" i]`))
      .first()
      .fill(String(text ?? ''), { timeout: 10_000 });
    return { uitgevoerd: true };
  },
  async browser_press({ key }) {
    const p = await zorgVoorPagina();
    await p.keyboard.press(String(key || '').trim());
    await p.waitForTimeout(800);
    return { uitgevoerd: true, url: p.url() };
  },
};

/* ---------------- WhatsApp ---------------- */

const WA_PROFIEL = path.join(DATA, 'whatsapp');
let waClient = null;
let waBoot = 'idle';
let waQr = null;
let waFout = null;
let waVolgende = 0;
let waMislukt = 0;

const waGekoppeld = () => {
  try { return fs.existsSync(WA_PROFIEL) && fs.readdirSync(WA_PROFIEL).length > 0; }
  catch { return false; }
};

async function waStart({ headless = true } = {}) {
  if (waClient && waBoot === 'ready') return waClient;
  if (waBoot === 'starting') throw new Error('Al bezig met verbinden met WhatsApp.');
  if (Date.now() < waVolgende) {
    throw new Error(`Vorige poging mislukte. Volgende poging over ${Math.ceil((waVolgende - Date.now()) / 1000)}s.`);
  }

  const exe = vindBrowser();
  if (!exe) throw new Error('Geen Chrome of Edge gevonden.');

  let wweb;
  try { wweb = (await import('whatsapp-web.js')).default || (await import('whatsapp-web.js')); }
  catch { throw new Error('whatsapp-web.js ontbreekt. Draai:  npm install whatsapp-web.js qrcode'); }

  const { Client, LocalAuth } = wweb;
  waBoot = 'starting'; waFout = null;
  fs.mkdirSync(WA_PROFIEL, { recursive: true });

  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: WA_PROFIEL }),
    puppeteer: { executablePath: exe, headless, args: ['--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage'] },
  });

  waClient.on('qr', (code) => { waQr = code; });
  waClient.on('authenticated', () => { waQr = null; });
  waClient.on('ready', () => { waBoot = 'ready'; waMislukt = 0; waFout = null; console.log(groen('  WhatsApp verbonden.')); });
  waClient.on('auth_failure', (m) => { waBoot = 'failed'; waFout = `Aanmelden mislukt: ${m}`; });
  waClient.on('disconnected', (r) => { waBoot = 'idle'; waFout = `Verbinding verbroken: ${r}`; waClient = null; });

  try {
    await waClient.initialize();
    return waClient;
  } catch (err) {
    waBoot = 'failed'; waFout = err.message; waClient = null;
    waMislukt += 1;
    // Oplopende pauze; anders start je laptop om de paar minuten een browser.
    waVolgende = Date.now() + Math.min(10 * 60_000, 60_000 * 2 ** (waMislukt - 1));
    throw err;
  }
}

const WHATSAPP = {
  async whatsapp_status() {
    return { gekoppeld: waGekoppeld(), boot: waBoot, fout: waFout, qr: Boolean(waQr) };
  },
  async whatsapp_link() {
    waStart({ headless: false }).catch(() => { /* de status vertelt het verhaal */ });
    return { gestart: true };
  },
  async whatsapp_qr() {
    if (!waQr) return { code: null, image: null };
    try {
      const QR = (await import('qrcode')).default;
      return { code: waQr, image: await QR.toDataURL(waQr, { margin: 1, width: 320, color: { dark: '#0b4630', light: '#ffffff' } }) };
    } catch {
      return { code: waQr, image: null };
    }
  },
  async whatsapp_panel() {
    if (!waGekoppeld()) {
      return { ok: false, reason: 'niet gekoppeld', hint: 'Koppel eenmalig via het koppelscherm in het dashboard.' };
    }
    if (waBoot !== 'ready') await waStart({ headless: true });
    const chats = await waClient.getChats();
    const open = chats.filter((c) => c.unreadCount > 0).slice(0, 6);
    // Alleen naam en aantal. De berichten zelf verlaten deze machine niet.
    return {
      ok: true,
      unread: chats.reduce((n, c) => n + (c.unreadCount || 0), 0),
      chats: open.map((c) => ({
        naam: c.name || c.id?.user || 'Onbekend',
        aantal: c.unreadCount,
        groep: Boolean(c.isGroup),
        tijd: c.timestamp ? new Date(c.timestamp * 1000).toISOString() : null,
      })),
    };
  },
};

const UITVOERDERS = { ...BROWSER, ...WHATSAPP };

/* ---------------- de lus ---------------- */

async function hartslag() {
  let heeftPlaywright = true;
  try { await import('playwright-core'); } catch { heeftPlaywright = false; }
  let heeftWa = true;
  try { await import('whatsapp-web.js'); } catch { heeftWa = false; }

  try {
    await api('/heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        versie: VERSIE,
        machine: os.hostname(),
        mogelijk: { browser: heeftPlaywright && Boolean(vindBrowser()), whatsapp: heeftWa },
      }),
    });
  } catch (err) {
    console.error(rood(`  Hartslag mislukt: ${err.message}`));
  }
}

async function eenRonde() {
  const { job } = await api('/poll');
  if (!job) return false;

  const uitvoerder = UITVOERDERS[job.soort];
  console.log(grijs(`  → ${job.soort}`));

  if (!uitvoerder) {
    await api('/result', { method: 'POST', body: JSON.stringify({ id: job.id, ok: false, fout: `Onbekende opdracht: ${job.soort}` }) });
    return true;
  }

  try {
    const resultaat = await uitvoerder(job.invoer || {});
    await api('/result', { method: 'POST', body: JSON.stringify({ id: job.id, ok: true, resultaat }) });
  } catch (err) {
    console.error(rood(`     ${err.message}`));
    await api('/result', { method: 'POST', body: JSON.stringify({ id: job.id, ok: false, fout: err.message }) });
  }
  return true;
}

console.log(`
${groen('  BOB-bridge')} draait.

  Website   ${SITE}
  Machine   ${os.hostname()}
  Profiel   ${DATA}

  ${grijs('Klikken en typen bereiken dit programma pas nadat jij in het dashboard')}
  ${grijs('akkoord hebt gegeven. Wachtwoord- en betaalvelden worden altijd geweigerd.')}
`);

await hartslag();
setInterval(hartslag, 20_000);

let stil = 0;
for (;;) {
  try {
    const wasErWerk = await eenRonde();
    stil = wasErWerk ? 0 : Math.min(stil + 1, 10);
  } catch (err) {
    console.error(rood(`  Kon de website niet bereiken: ${err.message}`));
    stil = 10;
  }
  // Rustig aan als er niets te doen is; meteen door als het druk is.
  await new Promise((r) => setTimeout(r, stil > 5 ? 3000 : 900));
}
