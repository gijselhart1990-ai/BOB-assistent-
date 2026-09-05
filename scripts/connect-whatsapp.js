#!/usr/bin/env node
/**
 * `bob connect-whatsapp`
 *
 * Koppelt WhatsApp via een QR-code, en gebruikt daarbij de Chrome of Edge
 * die al op je computer staat in plaats van 150 MB Chromium te downloaden.
 * Die download is op beheerde werklaptops meestal de reden dat het faalt.
 *
 * LEES DIT EERST. Er bestaat geen officiële API voor je persoonlijke
 * WhatsApp. Deze koppeling bestuurt WhatsApp Web in een verborgen browser:
 *   - kan breken zodra WhatsApp de site aanpast
 *   - kan in strijd zijn met WhatsApp's gebruiksvoorwaarden
 * BOB leest alleen ongelezen chats. Hij verstuurt nooit iets.
 */

import 'dotenv/config';
import { findBrowser } from '../server/connectors/whatsapp.js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[90m${s}\x1b[0m`;

console.log('');

const browser = findBrowser();
if (browser) {
  console.log(`  Browser gevonden: ${dim(browser)}`);
} else {
  console.log(yellow('  Geen Chrome of Edge gevonden op de gebruikelijke plekken.'));
  console.log('  Zet het pad zelf in .env, bijvoorbeeld:');
  console.log(dim('    WHATSAPP_BROWSER_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'));
  console.log('  Zonder browser probeert puppeteer er zelf een te downloaden — dat is');
  console.log('  precies wat op een werklaptop meestal geblokkeerd wordt.\n');
}

let wweb, qrcode;
try {
  wweb = (await import('whatsapp-web.js')).default;
  qrcode = (await import('qrcode-terminal')).default;
} catch {
  console.log(red('\n  whatsapp-web.js is niet geïnstalleerd.\n'));
  console.log('  Installeer het zonder de Chromium-download:\n');
  console.log('    set PUPPETEER_SKIP_DOWNLOAD=1');
  console.log('    npm.cmd install whatsapp-web.js qrcode-terminal\n');
  console.log(dim('  Reken op een paar minuten. Lukt de installatie niet, dan is WhatsApp'));
  console.log(dim('  op deze laptop geen begaanbare route — de rest van BOB werkt gewoon.\n'));
  process.exit(1);
}

if (!process.argv.includes('--akkoord')) {
  console.log(`
  ${yellow('Voorwaarden')}
  Er is geen officiële WhatsApp-API voor persoonlijke accounts. Deze
  koppeling automatiseert WhatsApp Web. Dat kan breken bij elke update
  en kan tegen WhatsApp's voorwaarden ingaan. BOB leest alleen mee.

  Ga je akkoord, draai dan:

      bob connect-whatsapp --akkoord
`);
  process.exit(0);
}

const { Client, LocalAuth } = wweb;
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bob' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...(browser ? { executablePath: browser } : {}),
  },
});

client.on('qr', (qr) => {
  console.log('\n  Scan deze code met je telefoon:');
  console.log(dim('  WhatsApp -> Instellingen -> Gekoppelde apparaten -> Apparaat koppelen\n'));
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log(`\n  ${green('Geauthenticeerd.')} Sessie opgeslagen in .wwebjs_auth/`));

client.on('ready', async () => {
  const chats = await client.getChats();
  const unread = chats.reduce((n, c) => n + (c.unreadCount || 0), 0);
  console.log(`\n  ${green('Verbonden.')} ${chats.length} chats, ${unread} ongelezen.`);
  console.log('\n  Zet nu WHATSAPP_ENABLED=1 in .env en herstart BOB:');
  console.log('      bob set-secret WHATSAPP_ENABLED    (typ: 1)\n');
  await client.destroy();
  process.exit(0);
});

client.on('auth_failure', (m) => { console.log(red(`\n  Koppelen mislukt: ${m}\n`)); process.exit(1); });

console.log('\n  Browser starten...');
client.initialize().catch((err) => {
  console.log(red(`\n  Starten mislukt: ${err.message}\n`));
  if (/Failed to launch|ENOENT|spawn/i.test(err.message)) {
    console.log('  De browser kon niet starten. Op beheerde laptops is dat vaak beleid.');
    console.log('  Dan is WhatsApp hier geen begaanbare route; de rest van BOB werkt gewoon.\n');
  }
  process.exit(1);
});
