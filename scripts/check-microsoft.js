#!/usr/bin/env node
/**
 * `npm run check:microsoft`
 *
 * Zegt in één klap of je Microsoft client-ID en secret kloppen, zonder dat je
 * de hele inlogdans hoeft te doen.
 *
 * De truc: we sturen bewust een onzin-autorisatiecode naar Microsoft.
 *   - Klopt je secret niet  -> AADSTS7000215 (invalid_client)
 *   - Klopt je secret wél   -> een klacht over de code (invalid_grant)
 * Die tweede fout is dus goed nieuws.
 */

import 'dotenv/config';

const id = process.env.MICROSOFT_CLIENT_ID || '';
const secret = process.env.MICROSOFT_CLIENT_SECRET || '';
const tenant = process.env.MICROSOFT_TENANT || 'common';
const port = process.env.PORT || 4321;

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

console.log('');

if (!id || !secret) {
  console.log(red('  MICROSOFT_CLIENT_ID of MICROSOFT_CLIENT_SECRET ontbreekt in .env\n'));
  process.exit(1);
}

const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(secret);
console.log(`  Client-ID   ${id}`);
console.log(`  Secret      ${secret.length} tekens, begint met "${secret.slice(0, 3)}…"`);
console.log(`  Tenant      ${tenant}\n`);

if (isGuid) {
  console.log(red('  Je secret is een GUID.'));
  console.log('  Dat is de \x1b[1mSecret ID\x1b[0m, niet de \x1b[1mValue\x1b[0m. In Entra staan die twee');
  console.log('  kolommen naast elkaar; je hebt de verkeerde gekopieerd.');
  console.log('  De Value is alleen zichtbaar direct nadat je de secret aanmaakt.\n');
  process.exit(1);
}

const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: id,
    client_secret: secret,
    grant_type: 'authorization_code',
    code: 'bob-test-code-verwacht-een-foutmelding',
    redirect_uri: `http://localhost:${port}/oauth/microsoft/callback`,
    scope: 'User.Read',
  }),
});

const json = await res.json().catch(() => ({}));
const code = String(json.error_description || '').match(/AADSTS\d+/)?.[0] || '';

if (code === 'AADSTS7000215') {
  console.log(red('  De secret wordt door Microsoft geweigerd.\n'));
  console.log('  Maak een nieuwe aan — de oude is vervallen, verwijderd of verkeerd gekopieerd:');
  console.log('    entra.microsoft.com -> App registrations -> je app');
  console.log('    -> Certificates & secrets -> New client secret');
  console.log(yellow('    -> kopieer de kolom "Value", meteen na het aanmaken.'));
  console.log('       Navigeer je weg, dan is de Value nooit meer op te vragen.\n');
  console.log('  Zet hem daarna veilig in .env met:  node scripts/set-secret.js\n');
  process.exit(1);
}

if (code === 'AADSTS7000112' || /disabled/i.test(json.error_description || '')) {
  console.log(red('  De app-registratie staat uit of is verwijderd in Entra.\n'));
  process.exit(1);
}

if (json.error === 'invalid_grant' || /AADSTS70000|AADSTS9002313|AADSTS501491/.test(json.error_description || '')) {
  console.log(green('  Client-ID en secret kloppen.'));
  console.log('  Microsoft klaagt alleen over de test-code, en dat hoort zo.\n');
  console.log(`  Koppelen kan nu: http://localhost:${port}/oauth/microsoft/start\n`);
  process.exit(0);
}

console.log(yellow('  Onverwacht antwoord van Microsoft:\n'));
console.log(`  ${json.error || res.status}: ${(json.error_description || '').split('\n')[0]}\n`);
process.exit(1);
