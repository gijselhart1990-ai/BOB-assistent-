import { config, redirectUri } from '../config.js';
import { store, cached } from '../store.js';

const M = () => config.microsoft;
const base = () => `https://login.microsoftonline.com/${M().tenant}/oauth2/v2.0`;
const GRAPH = 'https://graph.microsoft.com/v1.0';

/* ---------------- device code flow ----------------
 * De eenvoudigste route: geen client secret, geen redirect-URI.
 * BOB toont een code, jij typt die op microsoft.com/devicelogin.
 * Vereist in Entra: Authentication -> "Allow public client flows" = Yes.
 * Eén handeling meer dan de webroute, maar een hele klasse fouten minder:
 * secrets kunnen niet verlopen, niet verkeerd gekopieerd worden en niet
 * geweigerd worden.
 */
export async function deviceStart() {
  if (!M().clientId) throw new Error('MICROSOFT_CLIENT_ID ontbreekt in .env');
  const res = await fetch(`${base()}/devicecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: M().clientId, scope: M().scopes.join(' ') }),
  });
  const json = await res.json();
  if (!res.ok) {
    const d = json.error_description || '';
    if (/AADSTS7000218|public client/i.test(d)) {
      throw new Error(
        'Deze app-registratie staat niet toe dat er zonder secret ingelogd wordt.\n' +
        '  Zet in Entra bij je app: Authentication -> Advanced settings ->\n' +
        '  "Allow public client flows" op Yes, en probeer opnieuw.'
      );
    }
    throw new Error(`${json.error || res.status}: ${d.split('\n')[0]}`);
  }
  return json; // { device_code, user_code, verification_uri, expires_in, interval }
}

/** Blijft pollen tot je bent ingelogd. Slaat het token op zodra het binnen is. */
export async function devicePoll(device, { onTick } = {}) {
  const deadline = Date.now() + (device.expires_in || 900) * 1000;
  let interval = (device.interval || 5) * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));

    const res = await fetch(`${base()}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: M().clientId,
        device_code: device.device_code,
      }),
    });
    const json = await res.json();

    if (res.ok && json.access_token) {
      json.obtained_at = Date.now();
      json.public_client = true;
      store.writeToken('microsoft', json);
      return json;
    }

    switch (json.error) {
      case 'authorization_pending': onTick?.(); continue;
      case 'slow_down': interval += 5000; onTick?.(); continue;
      case 'authorization_declined': throw new Error('Je hebt de toegang geweigerd in het inlogscherm.');
      case 'expired_token': throw new Error('De code is verlopen. Start opnieuw.');
      case 'bad_verification_code': throw new Error('De code werd niet herkend. Start opnieuw.');
      default: throw new Error(`${json.error || res.status}: ${(json.error_description || '').split('\n')[0]}`);
    }
  }
  throw new Error('Time-out: er is niet binnen de geldigheidsduur ingelogd.');
}

export function authorizeUrl(state = 'bob') {
  const url = new URL(`${base()}/authorize`);
  url.searchParams.set('client_id', M().clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri('microsoft'));
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', M().scopes.join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeCode(code) {
  const res = await fetch(`${base()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: M().clientId,
      client_secret: M().clientSecret,
      code,
      redirect_uri: redirectUri('microsoft'),
      grant_type: 'authorization_code',
      scope: M().scopes.join(' '),
    }),
  });
  if (!res.ok) throw new Error(`Microsoft token ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const token = await res.json();
  token.obtained_at = Date.now();
  store.writeToken('microsoft', token);
  return token;
}

async function accessToken() {
  const token = store.readToken('microsoft');
  if (!token) throw new Error('Microsoft niet verbonden');
  const expiresAt = (token.obtained_at || 0) + (token.expires_in || 3600) * 1000 - 60_000;
  if (Date.now() < expiresAt && token.access_token) return token.access_token;
  if (!token.refresh_token) throw new Error('Microsoft-token verlopen, verbind opnieuw');

  // Bij device code flow is er geen secret; die dan ook niet meesturen,
  // anders weigert Microsoft de vernieuwing.
  const form = new URLSearchParams({
    client_id: M().clientId,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token',
    scope: M().scopes.join(' '),
  });
  if (!token.public_client && M().clientSecret) form.set('client_secret', M().clientSecret);

  const res = await fetch(`${base()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) throw new Error(`Microsoft refresh ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const fresh = await res.json();
  const merged = { ...token, ...fresh, obtained_at: Date.now() };
  store.writeToken('microsoft', merged);
  return merged.access_token;
}

async function api(pathname) {
  const at = await accessToken();
  const res = await fetch(GRAPH + pathname, {
    headers: { Authorization: `Bearer ${at}`, Prefer: `outlook.timezone="${config.timezone}"` },
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function dayBounds(offsetDays = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const microsoft = {
  id: 'microsoft',
  label: 'Outlook',
  configured: () => Boolean(M().clientId),
  connected: () => Boolean(store.readToken('microsoft')),

  async agenda(offsetDays = 0) {
    if (!this.connected()) return { ok: false, reason: 'not_connected' };
    return cached(`ms:agenda:${offsetDays}`, 120_000, async () => {
      const { start, end } = dayBounds(offsetDays);
      const json = await api(
        `/me/calendarview?startDateTime=${encodeURIComponent(start)}` +
        `&endDateTime=${encodeURIComponent(end)}` +
        '&$orderby=start/dateTime&$top=25' +
        '&$select=subject,start,end,location,isAllDay,webLink,onlineMeeting'
      );
      const events = (json.value || []).map((ev) => ({
        id: ev.id,
        title: ev.subject || '(geen titel)',
        start: ev.start?.dateTime ? `${ev.start.dateTime}Z`.replace('ZZ', 'Z') : null,
        end: ev.end?.dateTime ? `${ev.end.dateTime}Z`.replace('ZZ', 'Z') : null,
        allDay: Boolean(ev.isAllDay),
        location: ev.location?.displayName || null,
        calendar: 'Outlook',
        color: '#0f6cbd',
        link: ev.webLink,
        source: 'microsoft',
      }));
      return { ok: true, events };
    });
  },

  async mail() {
    if (!this.connected()) return { ok: false, reason: 'not_connected' };
    return cached('ms:mail', 90_000, async () => {
      const json = await api(
        '/me/mailFolders/inbox/messages?$filter=isRead%20eq%20false' +
        '&$top=6&$orderby=receivedDateTime%20desc' +
        '&$select=subject,from,receivedDateTime,bodyPreview,webLink'
      );
      const messages = (json.value || []).map((m) => ({
        id: m.id,
        from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || 'Onbekend',
        subject: m.subject || '(geen onderwerp)',
        snippet: (m.bodyPreview || '').slice(0, 140),
        date: m.receivedDateTime,
        link: m.webLink,
      }));
      return { ok: true, unread: messages.length, messages };
    });
  },
};
