#!/usr/bin/env node
/**
 * `bob connect-google`
 *
 * Koppelt Google Agenda en Gmail zonder dat BOB hoeft te draaien.
 *
 * Waarom: de link http://localhost:4321/oauth/google/start werkt alleen
 * zolang de BOB-server luistert. Draait die niet, dan krijg je een
 * onbereikbare pagina en lijkt er iets stuk. Dit script zet zelf even een
 * luisteraar op de callback-poort, doet de inlog, en stopt weer.
 */

import http from 'node:http';
import { exec } from 'node:child_process';
import 'dotenv/config';
import { config, redirectUri } from '../server/config.js';
import { authorizeUrl, exchangeCode, google } from '../server/connectors/google.js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[90m${s}\x1b[0m`;

console.log('');

if (!config.google.clientId || !config.google.clientSecret) {
  console.log(red('  GOOGLE_CLIENT_ID of GOOGLE_CLIENT_SECRET ontbreekt in .env.'));
  console.log('  Zie stap 6 in INSTALL.md, of zet ze erin met:');
  console.log('    bob set-secret GOOGLE_CLIENT_ID');
  console.log('    bob set-secret GOOGLE_CLIENT_SECRET\n');
  process.exit(1);
}

if (google.connected()) console.log(dim('  Er staat al een Google-koppeling. Deze wordt vervangen.\n'));

const page = (titel, tekst) => `<!doctype html><meta charset="utf-8"><title>${titel}</title>
<style>body{font-family:system-ui,Segoe UI,sans-serif;background:#f6f8f7;color:#0f2e22;display:grid;
place-items:center;min-height:100vh;margin:0}.c{background:#fff;border-radius:16px;padding:40px 48px;
box-shadow:0 8px 30px rgba(0,0,0,.08);max-width:460px;text-align:center}h1{margin:0 0 12px;font-size:22px}
p{margin:0;line-height:1.6;color:#456}</style>
<div class="c"><h1>${titel}</h1><p>${tekst}</p></div>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${config.port}`);
  if (!url.pathname.startsWith('/oauth/google/callback')) {
    res.writeHead(404).end('Niet gevonden');
    return;
  }

  const fout = url.searchParams.get('error');
  const code = url.searchParams.get('code');

  try {
    if (fout) throw new Error(fout);
    if (!code) throw new Error('Geen autorisatiecode ontvangen');
    await exchangeCode(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      .end(page('Google is gekoppeld', 'Je kunt dit tabblad sluiten en terug naar BOB.'));
    console.log(`\n  ${green('Google is gekoppeld.')}`);
    console.log('  Start BOB, dan staan je agenda en Gmail in het dashboard.\n');
    server.close(); process.exit(0);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
      .end(page('Koppelen mislukt', String(err.message)));
    console.log(`\n  ${red(`Koppelen mislukt: ${err.message}`)}`);
    if (/access_denied/.test(err.message)) {
      console.log('  Je hebt de toegang geweigerd in het inlogscherm.');
    } else if (/redirect_uri_mismatch/.test(err.message)) {
      console.log(`  De redirect-URI in Google Cloud moet exact zijn: ${redirectUri('google')}`);
    }
    console.log('');
    server.close(); process.exit(1);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(red(`  Poort ${config.port} is bezet.`));
    console.log('  Er draait waarschijnlijk al een BOB. Dat is niet erg — gebruik dan');
    console.log(`  gewoon de ingebouwde route in je browser:\n`);
    console.log(`    ${bold(`http://localhost:${config.port}/oauth/google/start`)}\n`);
    console.log('  Of sluit dat venster (Ctrl+C) en draai dit script opnieuw.\n');
  } else {
    console.log(red(`  Kon niet starten: ${err.message}\n`));
  }
  process.exit(1);
});

server.listen(config.port, '127.0.0.1', () => {
  const url = authorizeUrl();
  console.log('  Je browser opent nu een Google-inlogscherm.');
  console.log(dim('  Log in met het account waarvan je de agenda en mail wilt zien.\n'));
  console.log(`  Lukt dat niet, open dan zelf:\n  ${dim(url)}\n`);
  console.log('  Wachten op je inlog...  ' + dim('(Ctrl+C om te stoppen)'));

  const opener = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(opener, () => { /* lukt het niet, dan staat de link hierboven */ });
});

setTimeout(() => {
  console.log(red('\n  Time-out: er is binnen 5 minuten niet ingelogd.\n'));
  server.close(); process.exit(1);
}, 300_000).unref?.();
