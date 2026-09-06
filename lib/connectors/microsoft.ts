import { env, redirectUri } from '@/lib/env';
import { cached } from '@/lib/cache';
import { leesToken, schrijfToken, verlopen } from '@/lib/tokens';

const basis = () => `https://login.microsoftonline.com/${env.microsoft.tenant || 'common'}/oauth2/v2.0`;
const GRAPH = 'https://graph.microsoft.com/v1.0';

export function autorisatieUrl(state: string) {
  const url = new URL(`${basis()}/authorize`);
  url.searchParams.set('client_id', env.microsoft.id);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri('microsoft'));
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', env.microsoft.scopes.join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

export async function wisselCode(userId: string, code: string) {
  const form = new URLSearchParams({
    client_id: env.microsoft.id,
    code,
    redirect_uri: redirectUri('microsoft'),
    grant_type: 'authorization_code',
    scope: env.microsoft.scopes.join(' '),
  });
  // Zonder secret werkt de "public client" route. Die eisen zou de
  // device-code-variant onmogelijk maken, en dat is juist de betrouwbaarste.
  if (env.microsoft.secret) form.set('client_secret', env.microsoft.secret);

  const res = await fetch(`${basis()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) throw new Error(`Microsoft token ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const t = await res.json();
  await schrijfToken(userId, 'microsoft', {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    scope: t.scope,
    public_client: !env.microsoft.secret,
    expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
  });
}

async function toegang(userId: string) {
  const t = await leesToken(userId, 'microsoft');
  if (!t) throw Object.assign(new Error('Microsoft niet verbonden'), { status: 428 });
  if (t.access_token && !verlopen(t.expires_at)) return t.access_token;
  if (!t.refresh_token) throw Object.assign(new Error('Microsoft-token verlopen — koppel opnieuw'), { status: 428 });

  const form = new URLSearchParams({
    client_id: env.microsoft.id,
    refresh_token: t.refresh_token,
    grant_type: 'refresh_token',
    scope: env.microsoft.scopes.join(' '),
  });
  if (!t.public_client && env.microsoft.secret) form.set('client_secret', env.microsoft.secret);

  const res = await fetch(`${basis()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) throw new Error(`Microsoft verversen mislukt (${res.status})`);
  const fresh = await res.json();
  await schrijfToken(userId, 'microsoft', {
    ...t,
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token ?? t.refresh_token,
    expires_at: new Date(Date.now() + (fresh.expires_in ?? 3600) * 1000).toISOString(),
  });
  return fresh.access_token as string;
}

async function graph(userId: string, pad: string) {
  const at = await toegang(userId);
  const res = await fetch(`${GRAPH}${pad}`, { headers: { Authorization: `Bearer ${at}` } });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function dagGrenzen(offset = 0) {
  const nu = new Date();
  const start = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + offset, 0, 0, 0);
  const eind = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + offset, 23, 59, 59);
  return { start: start.toISOString(), eind: eind.toISOString() };
}

export const microsoft = {
  // Alleen de client-ID is verplicht — zie de opmerking bij wisselCode.
  ingesteld: () => Boolean(env.microsoft.id),

  async gekoppeld(userId: string) {
    return Boolean(await leesToken(userId, 'microsoft'));
  },

  async agenda(userId: string, offset = 0) {
    if (!microsoft.ingesteld()) return { ok: false, reason: 'niet ingesteld' as const, events: [] };
    if (!(await microsoft.gekoppeld(userId))) return { ok: false, reason: 'niet gekoppeld' as const, events: [] };

    return cached(`ms:agenda:${userId}:${offset}`, 120_000, async () => {
      const { start, eind } = dagGrenzen(offset);
      const d = await graph(userId,
        `/me/calendarView?startDateTime=${start}&endDateTime=${eind}&$orderby=start/dateTime&$top=25`);
      const events = (d.value || []).map((e: any) => ({
        id: e.id,
        title: e.subject || '(geen titel)',
        start: e.start?.dateTime ? `${e.start.dateTime}Z`.replace(/Z+$/, 'Z') : null,
        end: e.end?.dateTime ? `${e.end.dateTime}Z`.replace(/Z+$/, 'Z') : null,
        allDay: Boolean(e.isAllDay),
        location: e.location?.displayName || null,
        calendar: 'Outlook',
        color: '#0f6cbd',
        link: e.webLink,
        source: 'microsoft',
      }));
      return { ok: true, events };
    });
  },

  async mail(userId: string) {
    if (!microsoft.ingesteld()) return { ok: false, reason: 'niet ingesteld' as const, unread: 0, messages: [] };
    if (!(await microsoft.gekoppeld(userId))) return { ok: false, reason: 'niet gekoppeld' as const, unread: 0, messages: [] };

    return cached(`ms:mail:${userId}`, 90_000, async () => {
      const d = await graph(userId,
        '/me/mailFolders/inbox/messages?$filter=isRead eq false&$select=from,subject,receivedDateTime,webLink&$top=8&$orderby=receivedDateTime desc');
      const messages = (d.value || []).map((m: any) => ({
        id: m.id,
        from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || 'Onbekend',
        subject: m.subject || '(geen onderwerp)',
        date: m.receivedDateTime,
        link: m.webLink,
      }));
      let unread = messages.length;
      try {
        const f = await graph(userId, '/me/mailFolders/inbox?$select=unreadItemCount');
        if (typeof f.unreadItemCount === 'number') unread = f.unreadItemCount;
      } catch { /* het aantal is minder belangrijk dan de lijst */ }
      return { ok: true, unread, messages };
    });
  },
};
