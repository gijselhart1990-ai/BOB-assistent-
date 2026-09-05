import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config.js';

const TOKENS_DIR = path.join(DATA_DIR, 'tokens');

function ensure(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensure(DATA_DIR);
ensure(TOKENS_DIR);

/** Simpele JSON-opslag. Geen database nodig voor één gebruiker op één machine. */
export const store = {
  read(name, fallback = null) {
    const file = path.join(DATA_DIR, `${name}.json`);
    try {
      if (!fs.existsSync(file)) return fallback;
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return fallback;
    }
  },
  write(name, value) {
    ensure(DATA_DIR);
    fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(value, null, 2), 'utf8');
    return value;
  },
  readToken(provider) {
    const file = path.join(TOKENS_DIR, `${provider}.json`);
    try {
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  },
  writeToken(provider, token) {
    ensure(TOKENS_DIR);
    const file = path.join(TOKENS_DIR, `${provider}.json`);
    fs.writeFileSync(file, JSON.stringify(token, null, 2), { encoding: 'utf8', mode: 0o600 });
    return token;
  },
  clearToken(provider) {
    const file = path.join(TOKENS_DIR, `${provider}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  },
};

/** Kleine in-memory cache zodat panelen niet bij elke refresh de API's plat leggen. */
const cache = new Map();
export function cached(key, ttlMs, producer) {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return Promise.resolve(hit.value);
  return Promise.resolve(producer()).then((value) => {
    cache.set(key, { at: now, value });
    return value;
  });
}
export function invalidate(prefix = '') {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}
