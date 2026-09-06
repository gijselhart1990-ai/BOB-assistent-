import { env, redirectUri } from '@/lib/env';
import { cached } from '@/lib/cache';
import { leesToken, schrijfToken, verlopen } from '@/lib/tokens';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export function autorisatieUrl(state: string) {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', env.google.id);
  url.searchParams.set('redirect_uri', redirectUri('google'));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', env.google.scopes.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function wisselCode(userId: string, code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.google.id,
      client_secret: env.google.secret,
      redirect_uri: redirectUri('google'),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const t = await res.json();
  await schrijfToken(userId, 'google', {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    scope: t.scope,
    expires_at: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString(),
  });
}

async function toegang(userId: string) {
  const t = await leesToken(userId, 'google');
  if (!t) throw Object.assign(new Error('Google niet verbonden'), { status: 428 });
  if (t.access_token && !verlopen(t.expires_at)) return t.access_token;
  if (!t.refresh_token) throw Object.assign(new Error('Google-token verlopen — koppel opnieuw'), { status: 428 });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.google.id,
      client_secret: env.google.secret,
      refresh_token: t.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google verversen mislukt (${res.status})`);
  const fresh = await res.json();
  await schrijfToken(userId, 'google', {
    ...t,
    access_token: fresh.access_token,
    expires_at: new Date(Date.now() + (fresh.expires_in ?? 3600) * 1000).toISOString(),
  });
  return fresh.access_token as string;
}

async function api(userId: string, url: string) {
  const at = await toegang(userId);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${at}` } });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function dagGrenzen(offset = 0) {
  const nu = new Date();
  const start = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + offset, 0, 0, 0);
  const eind = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + offset, 23, 59, 59);
  return { start: start.toISOString(), eind: eind.toISOString() };
}

export const google = {
  ingesteld: () => Boolean(env.google.id && env.google.secret),

  async gekoppeld(userId: string) {
    return Boolean(await leesToken(userId, 'google'));
  },

  /** Alle kalenders van het account, niet alleen de primaire. */
  async agenda(userId: string, offset = 0) {
    if (!google.ingesteld()) return { ok: false, reason: 'niet ingesteld' as const, events: [] };
    if (!(await google.gekoppeld(userId))) return { ok: false, reason: 'niet gekoppeld' as const, events: [] };

    return cached(`g:agenda:${userId}:${offset}`, 120_000, async () => {
      const { start, eind } = dagGrenzen(offset);
      const lijst = await api(userId, 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader');
      const kalenders = (lijst.items || []).filter((c: any) => c.selected !== false).slice(0, 12);

      const alles: any[] = [];
      for (const cal of kalenders) {
        const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`);
        url.searchParams.set('timeMin', start);
        url.searchParams.set('timeMax', eind);
        url.searchParams.set('singleEvents', 'true');
        url.searchParams.set('orderBy', 'startTime');
        url.searchParams.set('maxResults', '25');
        try {
          const ev = await api(userId, url.toString());
          for (const e of ev.items || []) {
            if (e.status === 'cancelled') continue;
            alles.push({
              id: e.id,
              title: e.summary || '(geen titel)',
              start: e.start?.dateTime || e.start?.date,
              end: e.end?.dateTime || e.end?.date,
              allDay: Boolean(e.start?.date && !e.start?.dateTime),
              location: e.location || null,
              calendar: cal.summary,
              color: cal.backgroundColor || '#3b82f6',
              link: e.htmlLink,
              source: 'google',
            });
          }
        } catch { /* één kapotte agenda mag de rest niet slopen */ }
      }
      alles.sort((a, b) => String(a.start).localeCompare(String(b.start)));
      return { ok: true, events: alles };
    });
  },

  async mail(userId: string) {
    if (!google.ingesteld()) return { ok: false, reason: 'niet ingesteld' as const, unread: 0, messages: [] };
    if (!(await google.gekoppeld(userId))) return { ok: false, reason: 'niet gekoppeld' as const, unread: 0, messages: [] };

    return cached(`g:mail:${userId}`, 90_000, async () => {
      const lijst = await api(userId,
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' +
        encodeURIComponent('is:unread in:inbox category:primary') + '&maxResults=8');
      const messages: any[] = [];
      for (const m of (lijst.messages || []) as any[]) {
        try {
          const d = await api(userId,
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}` +
            '?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date');
          const h = Object.fromEntries((d.payload?.headers || []).map((x: any) => [x.name.toLowerCase(), x.value]));
          messages.push({
            id: m.id,
            from: (h.from || '').replace(/<.*>/, '').replace(/"/g, '').trim() || h.from,
            subject: h.subject || '(geen onderwerp)',
            snippet: d.snippet || '',
            date: h.date || null,
            link: `https://mail.google.com/mail/u/0/#inbox/${m.id}`,
          });
        } catch { /* sla dit bericht over */ }
      }
      return { ok: true, unread: lijst.resultSizeEstimate ?? messages.length, messages };
    });
  },
};
