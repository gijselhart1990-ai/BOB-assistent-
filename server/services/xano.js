import { config } from '../config.js';

const state = { connected: false, lastSyncAt: null, lastError: null };
let writeQueue = Promise.resolve();

const cleanBase = () => String(config.xano.apiBaseUrl || '').replace(/\/+$/, '');
const endpoint = () => String(config.xano.stateEndpoint || 'bob_state').replace(/^\/+|\/+$/g, '');

function headers() {
  const value = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (config.xano.authToken) value.Authorization = `Bearer ${config.xano.authToken}`;
  return value;
}

async function request(path = '', options = {}) {
  if (!configured()) throw new Error('XANO_API_BASE_URL ontbreekt');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${cleanBase()}/${endpoint()}${path}`, {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Xano antwoordde met ${response.status}`);
    const text = await response.text();
    state.connected = true;
    state.lastError = null;
    state.lastSyncAt = Date.now();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    state.connected = false;
    state.lastError = error.name === 'AbortError' ? 'Xano reageerde niet op tijd' : error.message;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function rowsFrom(response) {
  const rows = Array.isArray(response) ? response : response?.items;
  return Array.isArray(rows) ? rows.filter((row) => row && row.key) : [];
}

export function configured() { return Boolean(cleanBase()); }
export async function readAll() { return rowsFrom(await request('')); }

async function save(key, value) {
  const rows = await readAll();
  const current = rows.find((row) => row.key === key);
  const body = JSON.stringify({ key, value, updated_at: Date.now() });
  if (current?.id != null) return request(`/${encodeURIComponent(current.id)}`, { method: 'PATCH', body });
  return request('', { method: 'POST', body });
}

/** Schrijft geserialiseerd, zodat twee snelle dashboardacties elkaar niet inhalen. */
export function queueSave(key, value) {
  if (!configured()) return;
  writeQueue = writeQueue.then(() => save(key, value)).catch((error) => {
    console.warn(`\x1b[33m[BOB/Xano]\x1b[0m synchronisatie uitgesteld: ${error.message}`);
  });
}

export function status() {
  return {
    configured: configured(), connected: state.connected,
    lastSyncAt: state.lastSyncAt, error: state.lastError,
    signupUrl: config.xano.signupUrl,
  };
}
