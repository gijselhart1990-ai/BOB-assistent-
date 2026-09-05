import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

/**
 * Zoekt een browser die er al staat, in plaats van puppeteer 150 MB Chromium
 * te laten downloaden. Op een beheerde werklaptop is die download vaak
 * geblokkeerd, en je hebt Chrome of Edge toch al.
 */
export function findBrowser() {
  if (process.env.WHATSAPP_BROWSER_PATH) {
    return fs.existsSync(process.env.WHATSAPP_BROWSER_PATH) ? process.env.WHATSAPP_BROWSER_PATH : null;
  }
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const local = process.env.LOCALAPPDATA || '';
  const candidates = process.platform === 'win32' ? [
    path.join(pf, 'Google/Chrome/Application/chrome.exe'),
    path.join(pf86, 'Google/Chrome/Application/chrome.exe'),
    path.join(local, 'Google/Chrome/Application/chrome.exe'),
    path.join(pf86, 'Microsoft/Edge/Application/msedge.exe'),
    path.join(pf, 'Microsoft/Edge/Application/msedge.exe'),
  ] : [
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || null;
}

/**
 * WhatsApp-bridge — LET OP.
 *
 * Er bestaat geen officiële API voor je persoonlijke WhatsApp-account.
 * whatsapp-web.js automatiseert WhatsApp Web via een verborgen browser.
 * Dat betekent:
 *   - het kan breken zodra WhatsApp de website aanpast;
 *   - het kan in strijd zijn met de gebruiksvoorwaarden van WhatsApp;
 *   - je scant met je telefoon een QR-code om te koppelen.
 * BOB leest hier alleen mee: geen automatisch versturen van berichten.
 *
 * Aanzetten: `npm install whatsapp-web.js qrcode-terminal`,
 * dan `npm run whatsapp:link`, daarna WHATSAPP_ENABLED=1 in .env.
 */

let client = null;
let status = 'uit';
let lastError = null;
let chats = [];

// Startpogingen worden bewust begrensd. Zonder deze rem probeerde BOB
// bij élke dashboard-refresh opnieuw een browser te starten — op een
// werklaptop loopt dat binnen een minuut vast.
let bootState = 'idle';   // idle | busy | ready | failed
let bootAttempts = 0;
let nextRetryAt = 0;

function readableError(err) {
  const msg = String(err?.message || err || 'onbekende fout');
  if (msg.includes('whatsapp-web.js') || msg.includes('ERR_MODULE_NOT_FOUND')) {
    return 'whatsapp-web.js is niet geïnstalleerd. Draai `npm install whatsapp-web.js qrcode-terminal`, of zet WHATSAPP_ENABLED=0 in .env.';
  }
  if (/failed to launch|spawn|ENOENT|Could not find (Chromium|browser)/i.test(msg)) {
    return 'De verborgen browser kon niet starten — op beheerde werklaptops is dat vaak geblokkeerd. Zet WHATSAPP_ENABLED=0 in .env.';
  }
  return msg;
}

async function boot() {
  if (!config.whatsapp.enabled) return;
  if (bootState === 'busy' || bootState === 'ready') return;
  if (bootState === 'failed' && Date.now() < nextRetryAt) return;

  bootState = 'busy';
  bootAttempts += 1;
  status = 'starten';
  lastError = null;

  try {
    const { default: wweb } = await import('whatsapp-web.js');
    const { Client, LocalAuth } = wweb;

    const browser = findBrowser();
    client = new Client({
      authStrategy: new LocalAuth({ clientId: 'bob' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...(browser ? { executablePath: browser } : {}),
      },
    });

    client.on('qr', () => { status = 'qr-nodig'; });
    client.on('authenticated', () => { status = 'geauthenticeerd'; });
    client.on('ready', async () => { status = 'verbonden'; bootState = 'ready'; await refresh(); });
    client.on('message', () => { refresh().catch(() => {}); });
    client.on('disconnected', () => {
      status = 'verbroken'; client = null; bootState = 'idle'; bootAttempts = 0;
    });
    // whatsapp-web.js gooit fouten soms buiten de await om; opvangen
    // zodat ze nooit het hele proces meenemen.
    client.on('auth_failure', (m) => { lastError = String(m); status = 'fout'; });

    await client.initialize();
    if (bootState === 'busy') bootState = 'ready';
  } catch (err) {
    try { await client?.destroy?.(); } catch { /* al weg */ }
    client = null;
    bootState = 'failed';
    status = 'fout';
    lastError = readableError(err);
    // Oplopende wachttijd: 30s, 1m, 2m … tot maximaal 10 minuten.
    nextRetryAt = Date.now() + Math.min(600_000, 30_000 * 2 ** (bootAttempts - 1));
  }
}

async function refresh() {
  if (!client) return;
  try {
    const all = await client.getChats();
    chats = all
      .filter((c) => !c.isMuted)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 8)
      .map((c) => ({
        id: c.id?._serialized || String(c.id),
        name: c.name || c.formattedTitle || 'Onbekend',
        unread: c.unreadCount || 0,
        group: Boolean(c.isGroup),
        lastMessage: (c.lastMessage?.body || '').slice(0, 90),
        timestamp: c.timestamp ? c.timestamp * 1000 : null,
      }));
  } catch (err) {
    lastError = readableError(err);
  }
}

export const whatsapp = {
  id: 'whatsapp',
  label: 'WhatsApp',
  configured: () => config.whatsapp.enabled,

  async panel() {
    if (!config.whatsapp.enabled) {
      return {
        ok: false,
        reason: 'not_configured',
        hint: 'Draai `npm install whatsapp-web.js qrcode-terminal` en daarna `npm run whatsapp:link`, zet vervolgens WHATSAPP_ENABLED=1 in .env',
      };
    }

    // Bewust niet awaiten: het dashboard mag nooit wachten op een browser.
    boot().catch(() => {});

    if (bootState === 'failed') {
      return { ok: false, reason: 'error', status, hint: lastError };
    }
    if (status !== 'verbonden') {
      return { ok: false, reason: 'connecting', status, hint: lastError };
    }

    const unread = chats.reduce((sum, c) => sum + c.unread, 0);
    return { ok: true, status, badge: unread, chats };
  },

  async summary() {
    const p = await this.panel();
    if (!p.ok) return 'WhatsApp: niet verbonden.';
    if (!p.badge) return 'WhatsApp: geen ongelezen berichten.';
    const from = p.chats.filter((c) => c.unread).map((c) => c.name).slice(0, 4).join(', ');
    return `WhatsApp: ${p.badge} ongelezen, van ${from}.`;
  },
};
