#!/usr/bin/env node
/**
 * `bob connect-microsoft`
 *
 * Koppelt Outlook zonder client secret, via de device code flow.
 *
 * Waarom deze route: bij de webroute moet je een client secret aanmaken,
 * die op het juiste moment kopiëren (de waarde is maar één keer zichtbaar),
 * hem foutloos in .env krijgen, en hij verloopt na verloop van tijd.
 * Hier heb je alleen je client-ID nodig. Eén handeling meer — een code
 * overtypen — en een hele reeks foutmeldingen minder.
 *
 * Eenmalig in Entra: je app -> Authentication -> Advanced settings ->
 * "Allow public client flows" op Yes.
 */

import 'dotenv/config';
import { deviceStart, devicePoll, microsoft } from '../server/connectors/microsoft.js';
import { config } from '../server/config.js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[90m${s}\x1b[0m`;

console.log('');

if (!config.microsoft.clientId) {
  console.log(red('  MICROSOFT_CLIENT_ID ontbreekt in .env.'));
  console.log('  Haal hem op: entra.microsoft.com -> App registrations -> je app');
  console.log('  -> Overview -> Application (client) ID');
  console.log('  Zet hem erin met:  bob set-secret MICROSOFT_CLIENT_ID\n');
  process.exit(1);
}

if (microsoft.connected()) {
  console.log(dim('  Er staat al een Microsoft-koppeling. Deze wordt vervangen.\n'));
}

let device;
try {
  device = await deviceStart();
} catch (err) {
  console.log(red('  Starten mislukt:'));
  console.log(`  ${err.message}\n`);
  process.exit(1);
}

console.log(`  Ga naar   ${bold(device.verification_uri)}`);
console.log(`  Typ code  ${bold(device.user_code)}`);
console.log('');
console.log(dim(`  Log in met het account waarvan je de mail en agenda wilt zien.`));
console.log(dim(`  De code is ${Math.round((device.expires_in || 900) / 60)} minuten geldig.`));
console.log('');
process.stdout.write('  Wachten op je inlog');

try {
  const token = await devicePoll(device, { onTick: () => process.stdout.write('.') });
  console.log('\n');
  console.log(green('  Outlook is gekoppeld.'));
  if (token.scope) console.log(dim(`  Rechten: ${token.scope}`));
  console.log(`\n  Herstart BOB, dan staat je mail en agenda in het dashboard.\n`);
  process.exit(0);
} catch (err) {
  console.log('\n');
  console.log(red(`  ${err.message}`));
  if (/consent|AADSTS65001|admin/i.test(err.message)) {
    console.log('\n  Je organisatie vraagt om toestemming van een beheerder voor deze rechten.');
    console.log('  Dat kun je zelf niet omzeilen — leg het voor aan je IT-afdeling,');
    console.log('  of gebruik een persoonlijk Microsoft-account.');
  }
  console.log('');
  process.exit(1);
}
