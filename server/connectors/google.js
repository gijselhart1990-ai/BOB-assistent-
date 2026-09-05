import crypto from 'node:crypto';
import { config, redirectUri } from '../config.js';
import { store, cached } from '../store.js';

const G = () => config.google;
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PROFILE_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const ACCOUNT_LIST = 'google-accounts';
const LEGACY_ID = 'legacy';

const tokenKey = (id) => `google-${id}`;
const accountId = (email) => crypto.createHash('sha256').update(email).digest('hex').slice(0, 20);
const cleanEmail = (email) => String(email || '').trim().toLowerCase();

function storedAccounts() {
  const saved = store.read(ACCOUNT_LIST, []);
  const accounts = Array.isArray(saved) ? saved : [];
  const clean = accounts
    .filter((account) => account?.id && account?.email)
    .map((account) => ({ id: String(account.id), email: cleanEmail(account.email), addedAt: Number(account.addedAt || 0) }));

  // Oude BOB-installaties bewaarden één login als google.json. Die blijft
  // leesbaar totdat dezelfde account opnieuw via de nieuwe route is gekoppeld.
  if (store.readToken('google') && !clean.some((account) => account.id === LEGACY_ID)) {
    clean.push({ id: LEGACY_ID, email: 'eerder-gekoppeld Google-account', addedAt: 0, legacy: true });
  }
  return clean;
}

function saveAccounts(accounts) {
  const unique = new Map();
  for (const account of accounts) {
    if (account?.id && account?.email) unique.set(account.id, account);
  }
  store.write(ACCOUNT_LIST, [...unique.values()].sort((a, b) => String(a.email).localeCompare(String(b.email))));
}

function keyFor(account) { return account.id === LEGACY_ID ? 'google' : tokenKey(account.id); }

export function authorizeUrl(state = 'bob') {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', G().clientId);
  url.searchParams.set('redirect_uri', redirectUri('google'));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', G().scopes.join(' '));
  url.searchParams.set('access_type', 'offline');
  // Bij elke koppeling kiest Sander bewust een account. Zonder deze prompt
  // hergebruikt Google vaak stil het laatst actieve account.
  url.searchParams.set('prompt', 'select_account consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

async function profile(accessToken) {
  const res = await fetch(PROFILE_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google profiel ${res.status}`);
  const json = await res.json();
  const email = cleanEmail(json.email);
  if (!email || !email.includes('@')) throw new Error('Google gaf geen e-mailadres terug');
  return { email };
}

/** Wisselt de OAuth-code om en voegt het gekozen account naast de bestaande accounts toe. */
export async function exchangeCode(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: G().clientId,
      client_secret: G().clientSecret,
      redirect_uri: redirectUri('google'),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const fresh = await res.json();
  const identity = await profile(fresh.access_token);
  const account = { id: accountId(identity.email), email: identity.email, addedAt: Date.now() };
  const storage = keyFor(account);
  const previous = store.readToken(storage) || {};
  const token = {
    ...previous,
    ...fresh,
    refresh_token: fresh.refresh_token || previous.refresh_token,
    obtained_at: Date.now(),
  };
  store.writeToken(storage, token);
  saveAccounts([...storedAccounts().filter((item) => item.id !== account.id && item.id !== LEGACY_ID), account]);
  return account;
}

async function accessToken(account) {
  const storage = keyFor(account);
  const token = store.readToken(storage);
  if (!token) throw new Error(`${account.email}: Google niet verbonden`);
  const expiresAt = (token.obtained_at || 0) + (token.expires_in || 3600) * 1000 - 60_000;
  if (Date.now() < expiresAt && token.access_token) return token.access_token;
  if (!token.refresh_token) throw new Error(`${account.email}: Google-token verlopen, verbind opnieuw`);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: G().clientId,
      client_secret: G().clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`${account.email}: Google refresh ${res.status}`);
  const fresh = await res.json();
  const merged = { ...token, ...fresh, obtained_at: Date.now() };
  store.writeToken(storage, merged);
  return merged.access_token;
}

async function api(url, account) {
  const at = await accessToken(account);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${at}` } });
  if (!res.ok) throw new Error(`${account.email}: Google API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function dayBounds(offsetDays = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const google = {
  id: 'google',
  label: 'Google',
  configured: () => Boolean(G().clientId && G().clientSecret),
  connected: () => storedAccounts().length > 0,
  accounts: () => storedAccounts().map(({ id, email, addedAt }) => ({ id, email, addedAt })),

  /** Agenda's uit elk gekoppeld account, met het account zichtbaar bij elke afspraak. */
  async agenda(offsetDays = 0) {
    const accounts = storedAccounts();
    if (!accounts.length) return { ok: false, reason: 'not_connected', accounts: [] };
    const fingerprint = accounts.map((account) => account.id).join(':');
    return cached(`google:agenda:${offsetDays}:${fingerprint}`, 120_000, async () => {
      const { start, end } = dayBounds(offsetDays);
      const all = [];
      const failures = [];
      for (const account of accounts) {
        try {
          const list = await api('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader', account);
          const calendars = (list.items || []).filter((calendar) => calendar.selected !== false);
          for (const calendar of calendars.slice(0, 12)) {
            const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`);
            url.searchParams.set('timeMin', start);
            url.searchParams.set('timeMax', end);
            url.searchParams.set('singleEvents', 'true');
            url.searchParams.set('orderBy', 'startTime');
            url.searchParams.set('maxResults', '25');
            try {
              const events = await api(url.toString(), account);
              for (const event of events.items || []) {
                if (event.status === 'cancelled') continue;
                all.push({
                  id: `${account.id}:${event.id}`,
                  title: event.summary || '(geen titel)',
                  start: event.start?.dateTime || event.start?.date,
                  end: event.end?.dateTime || event.end?.date,
                  allDay: Boolean(event.start?.date && !event.start?.dateTime),
                  location: event.location || null,
                  calendar: `${account.email} · ${calendar.summary}`,
                  color: calendar.backgroundColor || '#3b82f6',
                  link: event.htmlLink,
                  source: 'google', account: account.email,
                });
              }
            } catch { /* Eén losse agenda mag de rest niet blokkeren. */ }
          }
        } catch (err) { failures.push(`${account.email}: ${err.message}`); }
      }
      all.sort((a, b) => String(a.start).localeCompare(String(b.start)));
      return { ok: Boolean(all.length || failures.length < accounts.length), events: all, accounts: this.accounts(), failures };
    });
  },

  async mail() {
    const accounts = storedAccounts();
    if (!accounts.length) return { ok: false, reason: 'not_connected', accounts: [] };
    const fingerprint = accounts.map((account) => account.id).join(':');
    return cached(`google:mail:${fingerprint}`, 90_000, async () => {
      const messages = [];
      let unread = 0;
      const failures = [];
      for (const account of accounts) {
        try {
          const list = await api(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' +
            encodeURIComponent('is:unread in:inbox category:primary') + '&maxResults=6', account
          );
          unread += Number(list.resultSizeEstimate || 0);
          for (const { id } of list.messages || []) {
            try {
              const message = await api(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
                '?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date', account
              );
              const headers = Object.fromEntries((message.payload?.headers || []).map((header) => [header.name.toLowerCase(), header.value]));
              messages.push({
                id: `${account.id}:${id}`,
                from: (headers.from || '').replace(/<.*>/, '').replace(/"/g, '').trim() || headers.from,
                subject: headers.subject || '(geen onderwerp)',
                snippet: message.snippet || '', date: headers.date || null,
                link: `https://mail.google.com/mail/u/${encodeURIComponent(account.email)}/#inbox/${id}`,
                account: account.email,
              });
            } catch { /* Eén bericht mag de inbox niet breken. */ }
          }
        } catch (err) { failures.push(`${account.email}: ${err.message}`); }
      }
      messages.sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0));
      return { ok: Boolean(messages.length || failures.length < accounts.length), unread, messages: messages.slice(0, 18), accounts: this.accounts(), failures };
    });
  },

  /** Recente Drive-bestanden als context voor BOB; inhoud wordt niet gedownload. */
  async drive() {
    const accounts = storedAccounts();
    if (!accounts.length) return { ok: false, reason: 'not_connected', items: [], accounts: [] };
    const fingerprint = accounts.map((account) => account.id).join(':');
    return cached(`google:drive:${fingerprint}`, 120_000, async () => {
      const items = [];
      const failures = [];
      for (const account of accounts) {
        try {
          const url = new URL('https://www.googleapis.com/drive/v3/files');
          url.searchParams.set('pageSize', '8');
          url.searchParams.set('orderBy', 'modifiedTime desc');
          url.searchParams.set('q', 'trashed = false');
          url.searchParams.set('fields', 'files(id,name,mimeType,modifiedTime,webViewLink,size)');
          const result = await api(url.toString(), account);
          for (const file of result.files || []) {
            items.push({ id: `${account.id}:${file.id}`, name: file.name || '(zonder naam)', mimeType: file.mimeType || '', modifiedTime: file.modifiedTime || null, link: file.webViewLink || `https://drive.google.com/open?id=${file.id}`, account: account.email });
          }
        } catch (err) { failures.push(`${account.email}: ${err.message}`); }
      }
      items.sort((a, b) => Date.parse(b.modifiedTime || 0) - Date.parse(a.modifiedTime || 0));
      return { ok: Boolean(items.length || failures.length < accounts.length), items: items.slice(0, 18), accounts: this.accounts(), failures };
    });
  },

  disconnectAll() {
    for (const account of storedAccounts()) store.clearToken(keyFor(account));
    store.write(ACCOUNT_LIST, []);
  },
};
