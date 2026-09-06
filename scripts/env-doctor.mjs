#!/usr/bin/env node
/**
 * De .env-dokter.
 *
 *   node scripts/env-doctor.mjs            kijken wat er mis is
 *   node scripts/env-doctor.mjs --nieuw    een verse .env aanmaken
 *   node scripts/env-doctor.mjs --herstel  repareren wat vanzelf kan
 *   node scripts/env-doctor.mjs --netlify  de regels voor Netlify afdrukken
 *
 * Waarom dit bestaat: een verkeerde sleutel geeft geen nette foutmelding op
 * je dashboard, maar een leeg vakje of een 503 diep in een route. Dan zoek je
 * een avond. Dit script belt elke dienst één keer op en zegt per sleutel of
 * hij werkt.
 *
 * Wat het NOOIT doet: een sleutel afdrukken. Alles wordt gemaskeerd, zodat je
 * de uitvoer kunt delen — met mij, of in een issue — zonder dat je opnieuw
 * alles moet vervangen.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const WORTEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV = resolve(WORTEL, '.env');

const NIEUW = process.argv.includes('--nieuw');
const HERSTEL = process.argv.includes('--herstel');
const NETLIFY = process.argv.includes('--netlify');

/* ------------------------------------------------------------------ */
/*  .env lezen en schrijven met behoud van commentaar                   */
/* ------------------------------------------------------------------ */

function lees() {
  if (!existsSync(ENV)) return { regels: [], waarden: {} };
  // BOM weghalen: Kladblok zet er een, en dan heet de eerste sleutel
  // "﻿NEXT_PUBLIC_SITE_URL" en vindt niemand hem terug.
  const ruw = readFileSync(ENV, 'utf8').replace(/^﻿/, '');
  const regels = ruw.split(/\r?\n/);
  const waarden = {};
  for (const regel of regels) {
    const m = regel.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    waarden[m[1]] = m[2].trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
  }
  return { regels, waarden };
}

function zet(regels, naam, waarde) {
  const i = regels.findIndex((r) => new RegExp(`^\\s*(?:export\\s+)?${naam}\\s*=`).test(r));
  if (i >= 0) regels[i] = `${naam}=${waarde}`;
  else regels.push(`${naam}=${waarde}`);
  return regels;
}

const geheim = (bytes = 48) => randomBytes(bytes).toString('base64url');

/* ------------------------------------------------------------------ */
/*  weergave                                                            */
/* ------------------------------------------------------------------ */

const masker = (v) => {
  if (!v) return '(leeg)';
  if (v.length <= 10) return `${v.slice(0, 2)}${'·'.repeat(6)}`;
  return `${v.slice(0, 4)}${'·'.repeat(8)}${v.slice(-4)} (${v.length})`;
};

const regels_uit = [];
const zeg = (s = '') => regels_uit.push(s);
let stuk = 0;
let let_op = 0;

function meld(status, naam, tekst) {
  const teken = status === 'ok' ? '[v]' : status === 'let op' ? '[!]' : status === 'leeg' ? '[ ]' : '[X]';
  if (status === 'fout') stuk++;
  if (status === 'let op') let_op++;
  zeg(`  ${teken} ${naam.padEnd(26)} ${tekst}`);
}

/** Een vervolgregel onder een melding, uitgelijnd met de tekst ernaast. */
const info_regel = (t) => zeg(`      ${' '.repeat(26)} ${t}`);

/* ------------------------------------------------------------------ */
/*  een verse .env                                                      */
/* ------------------------------------------------------------------ */

const SJABLOON = () => `# ============================================================
#  BOB — omgevingsvariabelen
#
#  Aangemaakt op ${new Date().toISOString().slice(0, 16).replace('T', ' ')}
#
#  Dit bestand hoort NOOIT in een repo. Het staat in .gitignore.
#  Zet dezelfde variabelen bij Netlify: Site configuration ->
#  Environment variables.
#
#  Controleren:  npm run env
# ============================================================

# --- Site -----------------------------------------------------
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# --- Toegang --------------------------------------------------
# Deze twee zijn hier ter plekke aangemaakt en staan nergens anders.
BOB_SESSION_SECRET=${geheim(48)}
BOB_LOGIN_CODE=${geheim(24)}

# Wie er binnen mag. Meerdere adressen met komma's.
BOB_ALLOWED_EMAILS=gijselhart1990@gmail.com
BOB_SESSION_DAYS=30

# --- Xano (database) ------------------------------------------
# app.xano.com -> Account -> Metadata API
# Scopes: Workspace Content Read/Write + Workspace Database Read/Write
XANO_INSTANCE_URL=https://x8ki-letl-twmt.n7.xano.io
XANO_METADATA_TOKEN=
XANO_WORKSPACE_ID=

# Vult zichzelf met:  npm run env -- --herstel
XANO_TABLE_OAUTH_TOKENS=
XANO_TABLE_BERICHTEN=
XANO_TABLE_INSTELLINGEN=
XANO_TABLE_BRIDGE_TOKENS=

# --- Mail (de inloglink versturen) ----------------------------
# resend.com/api-keys
RESEND_API_KEY=
SENDGRID_API_KEY=
BOB_MAIL_FROM=BOB <onboarding@resend.dev>

# --- Claude (het brein) ---------------------------------------
# console.anthropic.com -> API Keys
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5

# --- Cartesia (stem) ------------------------------------------
# play.cartesia.ai -> API Keys
CARTESIA_API_KEY=
CARTESIA_VOICE_ID=
CARTESIA_VERSION=2026-08-14
CARTESIA_TTS_MODEL=sonic-3.6
CARTESIA_STT_MODEL=ink-whisper
CARTESIA_LANGUAGE=nl

# --- Todoist --------------------------------------------------
# todoist.com/app/settings/integrations/developer
TODOIST_API_TOKEN=

# --- Google (Agenda + Gmail, alleen lezen) --------------------
# console.cloud.google.com -> Credentials -> OAuth client (Web)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# --- Microsoft (Outlook) --------------------------------------
# entra.microsoft.com -> App registrations
# Rechten DELEGATED, niet application.
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT=common

# --- Zoeken ---------------------------------------------------
# api-dashboard.search.brave.com
BRAVE_API_KEY=
BRAVE_COUNTRY=NL
BRAVE_LANG=nl

# --- Social (optioneel) ---------------------------------------
LINKEDIN_ACCESS_TOKEN=
INSTAGRAM_ACCESS_TOKEN=
FACEBOOK_ACCESS_TOKEN=
TIKTOK_ACCESS_TOKEN=
`;

if (NIEUW) {
  if (existsSync(ENV)) {
    const back = `${ENV}.oud-${Date.now()}`;
    copyFileSync(ENV, back);
    console.log(`\n  De oude .env is bewaard als ${back.split(/[\\/]/).pop()}`);
    console.log('  Verwijder die zodra je zeker weet dat alles werkt.\n');
  }
  writeFileSync(ENV, SJABLOON(), 'utf8');
  console.log('  [v] Nieuwe .env aangemaakt.');
  console.log('      BOB_SESSION_SECRET en BOB_LOGIN_CODE zijn hier op je eigen');
  console.log('      machine gegenereerd — die heeft niemand anders gezien.\n');
  console.log('  Vul nu de lege sleutels in en draai:  npm run env\n');
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/*  live tests                                                          */
/* ------------------------------------------------------------------ */

async function bel(url, opties = {}, msTimeout = 15000) {
  const stop = new AbortController();
  const t = setTimeout(() => stop.abort(), msTimeout);
  try {
    const res = await fetch(url, { ...opties, signal: stop.signal });
    const tekst = await res.text();
    let data = null;
    try { data = tekst ? JSON.parse(tekst) : null; } catch { /* geen JSON */ }
    return { status: res.status, ok: res.ok, data, tekst };
  } catch (err) {
    return { status: 0, ok: false, fout: err.name === 'AbortError' ? 'te traag' : String(err.message) };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Onderscheid tussen "de dienst wijst je sleutel af" en "je komt er niet eens
 * bij". Op een werklaptop met een proxy is dat verschil alles: anders ga je
 * een sleutel vervangen die niets mankeert.
 */
function netwerkProbleem(r) {
  if (r.status === 0) return r.fout || 'geen verbinding';
  if (/not in allowlist|egress|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|proxy/i.test(r.tekst || '')) {
    return 'geblokkeerd door het netwerk, niet door de dienst';
  }
  return null;
}

const { regels, waarden: E } = lees();

if (!existsSync(ENV)) {
  console.log('\n  Er is geen .env. Maak er een met:\n\n    npm run env -- --nieuw\n');
  process.exit(1);
}

const teVullen = {};

zeg('');
zeg('  BOB — controle van je omgevingsvariabelen');
zeg('  ============================================================');
zeg('');
zeg('  TOEGANG');

/* --- site --- */
{
  const v = E.NEXT_PUBLIC_SITE_URL || '';
  if (!v) meld('fout', 'NEXT_PUBLIC_SITE_URL', 'ontbreekt — zonder dit kloppen de inloglinks niet');
  else if (!/^https?:\/\//.test(v)) meld('fout', 'NEXT_PUBLIC_SITE_URL', 'moet met http:// of https:// beginnen');
  else if (v.endsWith('/')) meld('let op', 'NEXT_PUBLIC_SITE_URL', 'eindigt op een schuine streep — wordt genegeerd, maar haal hem weg');
  else meld('ok', 'NEXT_PUBLIC_SITE_URL', v);
}

/* --- sessiegeheim --- */
{
  const v = E.BOB_SESSION_SECRET || '';
  if (!v) meld('fout', 'BOB_SESSION_SECRET', 'ontbreekt — je komt nergens binnen');
  else if (v.length < 32) meld('fout', 'BOB_SESSION_SECRET', `${v.length} tekens, minstens 32 nodig`);
  else if (/^(test|geheim|secret|changeme)/i.test(v)) meld('fout', 'BOB_SESSION_SECRET', 'ziet eruit als een voorbeeldwaarde');
  else meld('ok', 'BOB_SESSION_SECRET', `${v.length} tekens`);
}

/* --- toegangslijst --- */
{
  const v = (E.BOB_ALLOWED_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!v.length) meld('fout', 'BOB_ALLOWED_EMAILS', 'leeg — dan mag niemand naar binnen, ook jij niet');
  else if (v.some((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) meld('fout', 'BOB_ALLOWED_EMAILS', 'er zit een adres tussen dat geen adres is');
  else if (v.some((e) => e !== e.toLowerCase())) meld('let op', 'BOB_ALLOWED_EMAILS', 'hoofdletters worden omlaag gehaald, dus dit werkt — maar netter in kleine letters');
  else meld('ok', 'BOB_ALLOWED_EMAILS', `${v.length} adres${v.length > 1 ? 'sen' : ''}`);
}

/* --- noodcode --- */
{
  const v = E.BOB_LOGIN_CODE || '';
  if (!v) meld('leeg', 'BOB_LOGIN_CODE', 'geen noodingang — prima als de mail werkt');
  else if (v.length < 20) meld('fout', 'BOB_LOGIN_CODE', `${v.length} tekens; onder de 20 wordt hij genegeerd, dus je denkt dat je een ingang hebt en die is er niet`);
  else meld('ok', 'BOB_LOGIN_CODE', `${v.length} tekens — haal hem weg zodra de mail werkt`);
}

/* --- Xano --------------------------------------------------------- */
zeg('');
zeg('  XANO (database)');

let xanoOk = false;
let xanoTabellen = [];
{
  const inst = (E.XANO_INSTANCE_URL || '').replace(/\/$/, '');
  const tok = E.XANO_METADATA_TOKEN || '';
  const ws = E.XANO_WORKSPACE_ID || '';

  if (!inst) meld('fout', 'XANO_INSTANCE_URL', 'ontbreekt');
  else if (!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.xano\.io$/i.test(inst)) {
    meld('let op', 'XANO_INSTANCE_URL', `${inst} — verwacht iets als https://x8ki-letl-twmt.n7.xano.io`);
  } else meld('ok', 'XANO_INSTANCE_URL', inst);

  // Het workspace-ID hoef je niet in een URL te gaan zoeken: met het token
  // erbij vraagt Xano zelf welke workspaces er zijn. Is er precies één, dan
  // vult --herstel hem in.
  if (!/^\d+$/.test(ws) && inst && tok) {
    const lijst = await bel(`${inst}/api:meta/workspace`, { headers: { Authorization: `Bearer ${tok}` } });
    const wss = Array.isArray(lijst.data) ? lijst.data : (lijst.data?.items ?? []);
    if (wss.length === 1) {
      meld('let op', 'XANO_WORKSPACE_ID',
        ws ? `"${ws}" klopt niet; je enige workspace is "${wss[0].name}" met id ${wss[0].id}`
           : `leeg; je enige workspace is "${wss[0].name}" met id ${wss[0].id}`);
      info_regel(`--herstel vult ${wss[0].id} voor je in`);
      teVullen.XANO_WORKSPACE_ID = String(wss[0].id);
    } else if (wss.length > 1) {
      meld('fout', 'XANO_WORKSPACE_ID', `kies er een uit je workspaces:`);
      for (const w of wss) info_regel(`id ${w.id}  —  ${w.name}`);
    } else if (netwerkProbleem(lijst)) {
      meld('fout', 'XANO_WORKSPACE_ID', 'ontbreekt — en ik kan Xano niet bereiken om hem op te zoeken');
    } else {
      meld('fout', 'XANO_WORKSPACE_ID',
        ws ? `"${ws}" is geen getal, en Xano geeft geen workspaces terug (${lijst.status})`
           : `ontbreekt, en Xano geeft geen workspaces terug (${lijst.status})`);
    }
  } else if (!ws) {
    meld('fout', 'XANO_WORKSPACE_ID', 'ontbreekt — vul eerst XANO_METADATA_TOKEN in, dan zoek ik hem erbij');
  } else if (!/^\d+$/.test(ws)) {
    meld('fout', 'XANO_WORKSPACE_ID', `"${ws}" is geen getal. De code uit de apispec-URL is het niet`);
  } else {
    meld('ok', 'XANO_WORKSPACE_ID', ws);
  }

  if (!tok) {
    meld('fout', 'XANO_METADATA_TOKEN', 'ontbreekt');
  } else if (inst && /^\d+$/.test(ws)) {
    const r = await bel(`${inst}/api:meta/workspace/${ws}/table`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    const net = netwerkProbleem(r);
    if (net) {
      meld('let op', 'XANO_METADATA_TOKEN', `niet te testen: ${net}`);
    } else if (r.status === 401 || r.status === 403) {
      meld('fout', 'XANO_METADATA_TOKEN', `${masker(tok)} — geweigerd (${r.status}). Mist de scope "Workspace Database: Read"?`);
    } else if (r.status === 404) {
      meld('fout', 'XANO_METADATA_TOKEN', `workspace ${ws} niet gevonden — klopt XANO_WORKSPACE_ID?`);
    } else if (!r.ok) {
      meld('fout', 'XANO_METADATA_TOKEN', `${r.status} ${r.fout || ''}`);
    } else {
      xanoOk = true;
      xanoTabellen = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      meld('ok', 'XANO_METADATA_TOKEN', `${masker(tok)} — werkt, ${xanoTabellen.length} tabellen zichtbaar`);
    }
  } else {
    meld('let op', 'XANO_METADATA_TOKEN', `${masker(tok)} — niet te testen zolang URL of workspace-ID ontbreekt`);
  }
}

/* --- de vier tabellen --- */
{
  const nodig = [
    ['XANO_TABLE_OAUTH_TOKENS', 'bob_oauth_tokens'],
    ['XANO_TABLE_BERICHTEN', 'bob_berichten'],
    ['XANO_TABLE_INSTELLINGEN', 'bob_instellingen'],
    ['XANO_TABLE_BRIDGE_TOKENS', 'bob_bridge_tokens'],
  ];
  for (const [sleutel, tabelnaam] of nodig) {
    const ingevuld = E[sleutel] || '';
    const gevonden = xanoTabellen.find((t) => t.name === tabelnaam);

    if (ingevuld && gevonden && String(gevonden.id) === String(ingevuld)) {
      meld('ok', sleutel, `${tabelnaam} (id ${ingevuld})`);
    } else if (ingevuld && gevonden) {
      meld('fout', sleutel, `staat op ${ingevuld}, maar ${tabelnaam} heeft id ${gevonden.id}`);
      teVullen[sleutel] = String(gevonden.id);
    } else if (!ingevuld && gevonden) {
      meld('let op', sleutel, `leeg, maar ${tabelnaam} bestaat (id ${gevonden.id}) — --herstel vult hem in`);
      teVullen[sleutel] = String(gevonden.id);
    } else if (ingevuld && xanoOk) {
      meld('fout', sleutel, `id ${ingevuld} ingevuld, maar er is geen tabel ${tabelnaam}`);
    } else if (xanoOk) {
      meld('fout', sleutel, `tabel ${tabelnaam} bestaat niet — draai: npm run xano -- --maak`);
    } else {
      meld('leeg', sleutel, 'niet te controleren zolang Xano niet werkt');
    }
  }
}

/* --- Mail --------------------------------------------------------- */
zeg('');
zeg('  INLOGGEN PER MAIL');
{
  const resend = E.RESEND_API_KEY || '';
  const sendgrid = E.SENDGRID_API_KEY || '';

  if (!resend && !sendgrid) {
    const code = (E.BOB_LOGIN_CODE || '').length >= 20;
    meld(code ? 'let op' : 'fout', 'RESEND_API_KEY',
      code ? 'geen mailer — inloggen kan alleen met BOB_LOGIN_CODE' : 'geen mailer én geen geldige BOB_LOGIN_CODE: je kunt niet inloggen');
  }

  if (resend) {
    if (!resend.startsWith('re_')) meld('let op', 'RESEND_API_KEY', 'begint niet met re_ — klopt dat?');
    const r = await bel('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${resend}` } });
    const net = netwerkProbleem(r);
    if (net) meld('let op', 'RESEND_API_KEY', `niet te testen: ${net}`);
    else if (r.status === 401 || r.status === 403) meld('fout', 'RESEND_API_KEY', `${masker(resend)} — geweigerd`);
    else if (r.ok) meld('ok', 'RESEND_API_KEY', `${masker(resend)} — werkt`);
    else meld('let op', 'RESEND_API_KEY', `${r.status} ${r.fout || ''}`);
  }

  if (sendgrid) {
    const r = await bel('https://api.sendgrid.com/v3/scopes', { headers: { Authorization: `Bearer ${sendgrid}` } });
    const net = netwerkProbleem(r);
    if (net) meld('let op', 'SENDGRID_API_KEY', `niet te testen: ${net}`);
    else if (r.status === 401 || r.status === 403) meld('fout', 'SENDGRID_API_KEY', `${masker(sendgrid)} — geweigerd`);
    else if (r.ok) meld('ok', 'SENDGRID_API_KEY', `${masker(sendgrid)} — werkt`);
    else meld('let op', 'SENDGRID_API_KEY', `${r.status} ${r.fout || ''}`);
  }

  const van = E.BOB_MAIL_FROM || '';
  const adres = (van.match(/<([^>]+)>/) || [null, van])[1];
  // Welke mailer gaat dit adres straks echt gebruiken? Een resend.dev-adres
  // is onschuldig bij Resend, maar bij SendGrid wordt het geweigerd: die
  // eist een geverifieerde afzender.
  const alleenSendgrid = Boolean(sendgrid) && !resend;

  if (!van) meld('let op', 'BOB_MAIL_FROM', 'leeg — dan gebruikt de code het Resend-testadres');
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adres || '')) meld('fout', 'BOB_MAIL_FROM', `"${van}" bevat geen geldig adres`);
  else if (adres.endsWith('@resend.dev') && alleenSendgrid) {
    meld('fout', 'BOB_MAIL_FROM', `${adres} — je verstuurt via SendGrid, en die weigert een afzender die daar niet geverifieerd is`);
    info_regel('zet er een adres neer dat in SendGrid als Single Sender is geverifieerd');
  } else if (adres.endsWith('@resend.dev')) {
    meld('let op', 'BOB_MAIL_FROM', 'testadres van Resend — mag alleen naar je eigen Resend-account mailen');
  } else meld('ok', 'BOB_MAIL_FROM', adres);

  if (resend && sendgrid) {
    meld('let op', 'twee mailers',
      'Resend en SendGrid staan allebei ingevuld; de code probeert Resend eerst en valt terug op SendGrid');
    info_regel('werkt er maar één, haal de andere regel dan weg — scheelt zoeken');
  }
}

/* --- Claude ------------------------------------------------------- */
zeg('');
zeg('  CONNECTOREN');
{
  const k = E.ANTHROPIC_API_KEY || '';
  const model = E.ANTHROPIC_MODEL || 'claude-sonnet-5';
  if (!k) meld('fout', 'ANTHROPIC_API_KEY', 'ontbreekt — zonder brein antwoordt BOB niet');
  else {
    const r = await bel('https://api.anthropic.com/v1/models?limit=100', {
      headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01' },
    });
    const net = netwerkProbleem(r);
    if (net) meld('let op', 'ANTHROPIC_API_KEY', `niet te testen: ${net}`);
    else if (r.status === 401 || r.status === 403) meld('fout', 'ANTHROPIC_API_KEY', `${masker(k)} — geweigerd. Ingetrokken of verkeerd gekopieerd`);
    else if (!r.ok) meld('let op', 'ANTHROPIC_API_KEY', `${r.status} ${r.fout || ''}`);
    else {
      meld('ok', 'ANTHROPIC_API_KEY', `${masker(k)} — werkt`);
      const ids = (r.data?.data || []).map((m) => m.id);
      if (!ids.length) meld('let op', 'ANTHROPIC_MODEL', 'kon de modellijst niet lezen');
      else if (ids.includes(model)) meld('ok', 'ANTHROPIC_MODEL', model);
      else meld('fout', 'ANTHROPIC_MODEL', `"${model}" bestaat niet. Beschikbaar: ${ids.slice(0, 6).join(', ')}`);
    }
  }
}

/* --- Cartesia --- */
{
  const k = E.CARTESIA_API_KEY || '';
  const stem = E.CARTESIA_VOICE_ID || '';
  const versie = E.CARTESIA_VERSION || '2026-08-14';
  if (!k) meld('leeg', 'CARTESIA_API_KEY', 'geen stem — de rest werkt gewoon');
  else {
    const r = await bel('https://api.cartesia.ai/voices/?limit=1', {
      headers: { 'X-API-Key': k, 'Cartesia-Version': versie },
    });
    const net = netwerkProbleem(r);
    if (net) meld('let op', 'CARTESIA_API_KEY', `niet te testen: ${net}`);
    else if (r.status === 401 || r.status === 403) meld('fout', 'CARTESIA_API_KEY', `${masker(k)} — geweigerd`);
    else if (r.status === 400 && /version/i.test(r.tekst || '')) meld('fout', 'CARTESIA_VERSION', `"${versie}" wordt niet geaccepteerd`);
    else if (!r.ok) meld('let op', 'CARTESIA_API_KEY', `${r.status} ${r.fout || ''}`);
    else meld('ok', 'CARTESIA_API_KEY', `${masker(k)} — werkt`);

    if (!stem) meld('fout', 'CARTESIA_VOICE_ID', 'leeg — met een sleutel maar zonder stem-ID blijft BOB stil');
    else {
      const r2 = await bel(`https://api.cartesia.ai/voices/${encodeURIComponent(stem)}`, {
        headers: { 'X-API-Key': k, 'Cartesia-Version': versie },
      });
      const net2 = netwerkProbleem(r2);
      if (net2) meld('let op', 'CARTESIA_VOICE_ID', `niet te testen: ${net2}`);
      else if (r2.status === 404) meld('fout', 'CARTESIA_VOICE_ID', `${stem} bestaat niet in dit account`);
      else if (r2.ok) meld('ok', 'CARTESIA_VOICE_ID', r2.data?.name ? `${r2.data.name}` : stem);
      else meld('let op', 'CARTESIA_VOICE_ID', `${r2.status}`);
    }
  }
}

/* --- Todoist --- */
{
  const k = E.TODOIST_API_TOKEN || '';
  if (!k) meld('leeg', 'TODOIST_API_TOKEN', 'geen taken');
  else {
    // Todoist heeft rest/v2 uitgezet: die geeft nu 410 Gone terug, ongeacht
    // je token. De connector in lib/ probeert daarom al api/v1 eerst; deze
    // controle deed dat niet en riep dus ten onrechte dat er iets stuk was.
    const bases = ['https://api.todoist.com/api/v1/projects', 'https://api.todoist.com/rest/v2/projects'];
    let laatste = null;
    let gelukt = null;
    for (const url of bases) {
      const r = await bel(url, { headers: { Authorization: `Bearer ${k}` } });
      laatste = r;
      if (r.ok) { gelukt = r; break; }
      if (r.status === 401 || r.status === 403) break; // token fout: verder proberen heeft geen zin
    }
    const net = netwerkProbleem(laatste);
    const aantal = (d) => (Array.isArray(d) ? d.length : (Array.isArray(d?.results) ? d.results.length : '?'));

    if (gelukt) meld('ok', 'TODOIST_API_TOKEN', `${masker(k)} — werkt, ${aantal(gelukt.data)} projecten`);
    else if (net) meld('let op', 'TODOIST_API_TOKEN', `niet te testen: ${net}`);
    else if (laatste.status === 401 || laatste.status === 403) meld('fout', 'TODOIST_API_TOKEN', `${masker(k)} — geweigerd`);
    else meld('let op', 'TODOIST_API_TOKEN', `${laatste.status} — geen van de bekende endpoints antwoordde`);
  }
}

/* --- Google --- */
{
  const id = E.GOOGLE_CLIENT_ID || '';
  const sec = E.GOOGLE_CLIENT_SECRET || '';
  if (!id && !sec) meld('leeg', 'GOOGLE_CLIENT_ID', 'geen Google-agenda en -mail');
  else if (!id.endsWith('.apps.googleusercontent.com')) {
    meld('fout', 'GOOGLE_CLIENT_ID', 'moet eindigen op .apps.googleusercontent.com');
  } else if (!sec) {
    meld('fout', 'GOOGLE_CLIENT_SECRET', 'ontbreekt terwijl de client-ID er wel is');
  } else {
    // Een bewust ongeldige refresh token. Google antwoordt dan met
    // invalid_client als de combinatie fout is, en met invalid_grant als
    // die klopt maar de token niet. Dat tweede is wat we willen zien.
    const r = await bel('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: 'controle', client_id: id, client_secret: sec }),
    });
    const f = r.data?.error || '';
    const net = netwerkProbleem(r);
    if (net) meld('let op', 'GOOGLE_CLIENT_ID', `niet te testen: ${net}`);
    else if (f === 'invalid_client') meld('fout', 'GOOGLE_CLIENT_SECRET', 'client-ID en secret horen niet bij elkaar, of het secret is ingetrokken');
    else if (f === 'invalid_grant') meld('ok', 'GOOGLE_CLIENT_ID', `${masker(id)} + secret — werken`);
    else meld('let op', 'GOOGLE_CLIENT_ID', `onverwacht antwoord: ${f || r.status}`);
    zeg(`      redirect-URI moet zijn: ${(E.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')}/api/oauth/google/callback`);
  }
}

/* --- Microsoft --- */
{
  const id = E.MICROSOFT_CLIENT_ID || '';
  const sec = E.MICROSOFT_CLIENT_SECRET || '';
  const tenant = E.MICROSOFT_TENANT || 'common';
  if (!id) meld('leeg', 'MICROSOFT_CLIENT_ID', 'geen Outlook');
  else if (!/^[0-9a-f-]{36}$/i.test(id)) meld('fout', 'MICROSOFT_CLIENT_ID', 'moet een GUID zijn');
  else if (!sec) meld('let op', 'MICROSOFT_CLIENT_ID', `${masker(id)} — geen secret; werkt alleen als de app als public client staat`);
  else {
    const t = tenant === 'common' ? 'organizations' : tenant;
    const r = await bel(`https://login.microsoftonline.com/${t}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default', client_id: id, client_secret: sec }),
    });
    const code = String(r.data?.error_description || r.tekst || '');
    const net = netwerkProbleem(r);
    if (net) meld('let op', 'MICROSOFT_CLIENT_ID', `niet te testen: ${net}`);
    else if (/AADSTS7000215/.test(code)) meld('fout', 'MICROSOFT_CLIENT_SECRET', 'ongeldig secret — waarschijnlijk verlopen of de waarde in plaats van de ID gekopieerd');
    else if (/AADSTS700016/.test(code)) meld('fout', 'MICROSOFT_CLIENT_ID', 'app niet gevonden in deze tenant');
    else if (r.ok || /AADSTS500011|AADSTS7000218/.test(code)) meld('ok', 'MICROSOFT_CLIENT_ID', `${masker(id)} + secret — werken`);
    else meld('let op', 'MICROSOFT_CLIENT_ID', code.slice(0, 90) || `${r.status}`);
    zeg(`      redirect-URI moet zijn: ${(E.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')}/api/oauth/microsoft/callback`);
    zeg('      rechten DELEGATED houden: User.Read, Mail.Read, Calendars.Read');
  }
}

/* --- Brave --- */
{
  const k = E.BRAVE_API_KEY || '';
  if (!k) meld('leeg', 'BRAVE_API_KEY', 'geen webzoekopdrachten');
  else {
    const r = await bel('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
      headers: { 'X-Subscription-Token': k, Accept: 'application/json' },
    });
    const net = netwerkProbleem(r);
    if (net) meld('let op', 'BRAVE_API_KEY', `niet te testen: ${net}`);
    else if (r.status === 401 || r.status === 403) meld('fout', 'BRAVE_API_KEY', `${masker(k)} — geweigerd`);
    else if (r.status === 429) meld('let op', 'BRAVE_API_KEY', 'snelheidslimiet; de sleutel zelf lijkt goed');
    else if (r.ok) meld('ok', 'BRAVE_API_KEY', `${masker(k)} — werkt`);
    else meld('let op', 'BRAVE_API_KEY', `${r.status} ${r.fout || ''}`);
  }
}

/* --- social (alleen aanwezigheid) --- */
{
  const s = ['LINKEDIN_ACCESS_TOKEN', 'INSTAGRAM_ACCESS_TOKEN', 'FACEBOOK_ACCESS_TOKEN', 'TIKTOK_ACCESS_TOKEN'].filter((n) => E[n]);
  meld(s.length ? 'ok' : 'leeg', 'SOCIAL', s.length ? `${s.length} token(s) ingevuld` : 'geen tokens — de tellers tonen een streepje');
}

/* --- vormfouten die iedereen een keer maakt --- */
zeg('');
zeg('  VORM VAN HET BESTAND');
{
  const ruw = readFileSync(ENV, 'utf8');
  let schoon = true;
  if (ruw.charCodeAt(0) === 0xfeff) { meld('fout', 'BOM', 'het bestand begint met een BOM (Kladblok) — de eerste sleutel wordt niet gelezen'); schoon = false; }
  for (const [n, v] of Object.entries(E)) {
    if (/^["'].*["']$/.test(v)) { meld('let op', n, 'staat tussen aanhalingstekens — die worden meegelezen als deel van de waarde'); schoon = false; }
    if (v !== v.trim()) { meld('let op', n, 'heeft spaties aan het begin of eind'); schoon = false; }
    if (/\s#/.test(v)) { meld('let op', n, 'lijkt een commentaar op dezelfde regel te hebben; dat hoort op een eigen regel'); schoon = false; }
  }
  if (schoon) meld('ok', 'opmaak', 'geen BOM, geen aanhalingstekens, geen losse spaties');
}

/* ------------------------------------------------------------------ */
/*  herstellen                                                          */
/* ------------------------------------------------------------------ */

if (HERSTEL) {
  let nieuweRegels = [...regels];
  let veranderd = 0;

  for (const [k, v] of Object.entries(teVullen)) { nieuweRegels = zet(nieuweRegels, k, v); veranderd++; }

  if (!E.BOB_SESSION_SECRET || E.BOB_SESSION_SECRET.length < 32) {
    nieuweRegels = zet(nieuweRegels, 'BOB_SESSION_SECRET', geheim(48)); veranderd++;
  }
  // Aanhalingstekens en spaties eruit.
  nieuweRegels = nieuweRegels.map((r) => {
    const m = r.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) return r;
    const schoon = m[2].trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    if (schoon !== m[2]) veranderd++;
    return `${m[1]}=${schoon}`;
  });

  if (veranderd) {
    copyFileSync(ENV, `${ENV}.oud-${Date.now()}`);
    writeFileSync(ENV, nieuweRegels.join('\n').replace(/^﻿/, ''), 'utf8');
    zeg('');
    zeg(`  [v] ${veranderd} ding(en) hersteld. De oude versie staat ernaast als .env.oud-…`);
    zeg('      Draai npm run env nog eens om te zien wat er overblijft.');
  } else {
    zeg('');
    zeg('  Er viel niets automatisch te herstellen.');
  }
}

/* ------------------------------------------------------------------ */
/*  Netlify                                                             */
/* ------------------------------------------------------------------ */

if (NETLIFY) {
  zeg('');
  zeg('  VOOR NETLIFY');
  zeg('  ------------------------------------------------------------');
  zeg('  Site configuration -> Environment variables -> Import from a .env file,');
  zeg('  en plak dit blok. Let op NEXT_PUBLIC_SITE_URL: daar hoort je');
  zeg('  netlify.app-adres, niet localhost.');
  zeg('');
  for (const [k, v] of Object.entries(E)) {
    if (!v) continue;
    zeg(`  ${k}=${k === 'NEXT_PUBLIC_SITE_URL' ? 'https://JOUW-SITE.netlify.app' : v}`);
  }
  zeg('');
  zeg('  (Dit blok bevat je echte sleutels. Plak het alleen bij Netlify.)');
}

/* ------------------------------------------------------------------ */

zeg('');
zeg('  ============================================================');
if (stuk) {
  zeg(`  ${stuk} ding(en) zijn stuk${let_op ? ` en ${let_op} verdien${let_op === 1 ? 't' : 'en'} aandacht` : ''}.`);
  zeg('  Probeer eerst:  npm run env -- --herstel');
} else if (let_op) {
  zeg(`  Niets stuk. ${let_op} ding(en) om even naar te kijken.`);
} else {
  zeg('  Alles werkt.');
}
zeg('  ============================================================');
zeg('');

console.log(regels_uit.join('\n'));
process.exitCode = stuk ? 1 : 0;
