import { env, redirectUri, microsoftIngesteld } from '@/lib/env';
import { cached } from '@/lib/cache';
import { verlopen, microsoftToken, microsoftIdentiteit } from '@/lib/oauth-validation';
import { gekozenGoogleAccount } from '@/lib/google-accounts';
import { microsoftAccountStore, type MicrosoftAccount } from '@/lib/microsoft-account-store';

const basis = () => `https://login.microsoftonline.com/${env.microsoft.tenant || 'common'}/oauth2/v2.0`;
const GRAPH = 'https://graph.microsoft.com/v1.0';

export function autorisatieUrl(state: string, challenge: string) {
  const url = new URL(`${basis()}/authorize`);
  url.searchParams.set('client_id', env.microsoft.id);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri('microsoft'));
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', env.microsoft.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('login_hint', env.microsoft.accountEmail);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export async function microsoftContext(userId: string) {
  if (!microsoftIngesteld()) return null;
  const account = await gekozenGoogleAccount(userId);
  return account?.email.toLowerCase() === env.microsoft.contextEmail ? account : null;
}

export async function wisselCode(userId: string, code: string, verifier: string, context: string) {
  const selected = await microsoftContext(userId);
  if (!selected || selected.subject !== context) throw new Error('De werkcontext is gewijzigd. Begin opnieuw.');
  const form = new URLSearchParams({
    client_id: env.microsoft.id,
    client_secret: env.microsoft.secret,
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri('microsoft'),
    grant_type: 'authorization_code',
    scope: env.microsoft.scopes.join(' '),
  });
  const token = microsoftToken(await tokenVerzoek(form));
  const profile = await graphVerzoek(token.access_token!, '/me?$select=id,mail,userPrincipalName');
  const identity = microsoftIdentiteit(profile, env.microsoft.accountEmail);
  // Alleen een volledig geverifieerde identiteit mag een bestaande koppeling vervangen.
  await microsoftAccountStore(userId, context).save({ tenant: env.microsoft.tenant,
    subject: identity.subject, email: identity.email, token });
}

async function tokenVerzoek(form: URLSearchParams) {
  const res = await fetch(`${basis()}/token`, { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Microsoft-aanmelding mislukt (${res.status}). Koppel zo nodig opnieuw.`);
  return res.json();
}

async function verbinding(userId: string) {
  const context = await microsoftContext(userId);
  if (!context) return null;
  const store = microsoftAccountStore(userId, context.subject);
  const account = await store.read();
  if (!account || account.tenant !== env.microsoft.tenant || account.email !== env.microsoft.accountEmail) return null;
  return { store, account, context: context.subject };
}

async function toegang(connection: NonNullable<Awaited<ReturnType<typeof verbinding>>>) {
  const { store, account } = connection;
  const t = account.token;
  if (t.access_token && !verlopen(t.expires_at)) return t.access_token;
  if (!t.refresh_token) throw Object.assign(new Error('Microsoft-token verlopen — koppel opnieuw'), { status: 428 });

  const form = new URLSearchParams({
    client_id: env.microsoft.id,
    client_secret: env.microsoft.secret,
    refresh_token: t.refresh_token,
    grant_type: 'refresh_token',
    scope: env.microsoft.scopes.join(' '),
  });
  const fresh = microsoftToken(await tokenVerzoek(form), t);
  if (await store.save({ ...account, token: fresh }, account.version)) return fresh.access_token!;
  // Een gelijktijdige verversing of herkoppeling heeft voorrang; overschrijf die niet.
  const latest = await store.read();
  if (!latest || latest.subject !== account.subject || latest.tenant !== account.tenant
    || verlopen(latest.token.expires_at)) throw new Error('Outlook-koppeling gewijzigd. Vernieuw het dashboard.');
  return latest.token.access_token!;
}

async function graphVerzoek(at: string, pad: string) {
  const res = await fetch(`${GRAPH}${pad}`, { headers: { Authorization: `Bearer ${at}` },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Outlook ophalen mislukt (${res.status}).`);
  return res.json();
}

function cacheScope(owner: string, context: string, account: MicrosoftAccount) {
  return JSON.stringify([owner, context, account.tenant, account.subject, account.version]);
}

function dagGrenzen(offset = 0) {
  const nu = new Date();
  const start = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + offset, 0, 0, 0);
  const eind = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + offset, 23, 59, 59);
  return { start: start.toISOString(), eind: eind.toISOString() };
}

export const microsoft = {
  ingesteld: microsoftIngesteld,

  async gekoppeld(userId: string) {
    return Boolean(await verbinding(userId));
  },

  async agenda(userId: string, offset = 0) {
    if (!microsoft.ingesteld()) return { ok: false, reason: 'niet ingesteld' as const, events: [] };
    const connection = await verbinding(userId);
    if (!connection) return { ok: false, reason: 'niet gekoppeld' as const, events: [] };

    return cached(`ms:agenda:${cacheScope(userId, connection.context, connection.account)}:${offset}`, 120_000, async () => {
      const { start, eind } = dagGrenzen(offset);
      const d = await graphVerzoek(await toegang(connection),
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
    const connection = await verbinding(userId);
    if (!connection) return { ok: false, reason: 'niet gekoppeld' as const, unread: 0, messages: [] };

    return cached(`ms:mail:${cacheScope(userId, connection.context, connection.account)}`, 90_000, async () => {
      const at = await toegang(connection);
      const d = await graphVerzoek(at,
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
        const f = await graphVerzoek(at, '/me/mailFolders/inbox?$select=unreadItemCount');
        if (typeof f.unreadItemCount === 'number') unread = f.unreadItemCount;
      } catch { /* het aantal is minder belangrijk dan de lijst */ }
      return { ok: true, unread, messages };
    });
  },
};
