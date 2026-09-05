#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
const authBase = String(process.env.XANO_AUTH_API_BASE_URL || '').replace(/\/+$/, '');

if (!authBase) {
  console.error('XANO_AUTH_API_BASE_URL ontbreekt in .env.');
  process.exit(1);
}

// Controleer vóór het externe signup-verzoek of het token ook echt lokaal
// opgeslagen kan worden. Zo ontstaat er nooit een onbruikbaar serviceaccount.
try {
  fs.accessSync(envFile, fs.constants.R_OK | fs.constants.W_OK);
} catch {
  console.error('BOB kan .env niet lezen en schrijven.');
  process.exit(1);
}

const suffix = crypto.randomBytes(8).toString('hex');
const password = crypto.randomBytes(32).toString('base64url');
const response = await fetch(`${authBase}/auth/signup`, {
  method: 'POST',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'BOB local service',
    email: `bob-service-${suffix}@example.com`,
    password,
  }),
});

const body = await response.json().catch(() => ({}));
if (!response.ok || !body.authToken) {
  console.error(`Xano-koppeling mislukt (${response.status}).`);
  process.exit(1);
}

const raw = fs.readFileSync(envFile, 'utf8');
const lines = raw.split(/\r?\n/);
let found = false;
const updated = lines.map((line) => {
  if (!line.startsWith('XANO_AUTH_TOKEN=')) return line;
  found = true;
  return `XANO_AUTH_TOKEN=${body.authToken}`;
});
if (!found) updated.push(`XANO_AUTH_TOKEN=${body.authToken}`);
fs.writeFileSync(envFile, updated.join('\n'), { encoding: 'utf8', mode: 0o600 });

console.log('Xano-serviceaccount aangemaakt en het token is veilig in .env opgeslagen.');
