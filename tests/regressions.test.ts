import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test, mock } from 'node:test';
import { getStore } from '@netlify/blobs';
import { beslissing, internPad } from '../lib/validation';
import { publiekAdres, controleerDoel } from '../lib/web/fetch-public';
import { requiresApproval } from '../lib/foundation/policy';

process.env.BOB_SESSION_SECRET = 'test-secret-met-minstens-tweeendertig-tekens';
process.env.NETLIFY_SITE_ID = '00000000-0000-4000-8000-000000000000';
process.env.NETLIFY_AUTH_TOKEN = 'test-only';

test('inloggen verwijst uitsluitend naar interne paden', () => {
  for (const pad of ['https://evil.example', '//evil.example', '/\\evil.example', '/\t/evil.example', null]) assert.equal(internPad(pad), '/');
  assert.equal(internPad('/mail?tab=nieuw'), '/mail?tab=nieuw');
});

test('toestemming vereist een boolean en een opdracht-id', () => {
  const id = '00000000-0000-4000-8000-000000000000';
  assert.equal(beslissing({ id, allow: false }, 'allow').toegestaan, false);
  assert.equal(beslissing({ id, allow: true }, 'allow').toegestaan, true);
  for (const allow of ['false', 'true', 1, null, undefined]) assert.throws(() => beslissing({ id, allow }, 'allow'));
  for (const body of [null, [], { id: '../ander', allow: true }]) assert.throws(() => beslissing(body, 'allow'));
});

test('onbekende acties vallen niet door de goedkeuringsregel', () => {
  assert.equal(requiresApproval('read', 'read'), false);
  for (const action of ['send', 'execute', '', 'unrecognized']) assert.equal(requiresApproval(action, 'read'), true);
});

test('webverzoeken weigeren interne, gereserveerde en IPv4-in-IPv6 adressen', async () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '0.0.0.0', '192.168.1.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '100.64.0.1']) {
    assert.equal(publiekAdres(address), false, address);
  }
  assert.equal(publiekAdres('8.8.8.8'), true);
  await assert.rejects(controleerDoel(new URL('http://[::ffff:127.0.0.1]')));
  await assert.rejects(controleerDoel(new URL('file:///etc/passwd')));
  await assert.rejects(controleerDoel(new URL('https://user:pass@example.com')));
});

test('server en middleware weigeren ondertekende ongeldige vervaltijden', async () => {
  const { leesSessie, leesInlogToken, leesState } = await import('../lib/session');
  const { sessieGeldig } = await import('../middleware');
  const teken = (kern: string) => `${kern}.${createHmac('sha256', process.env.BOB_SESSION_SECRET!).update(kern).digest('base64url')}`;
  const email = Buffer.from('test@example.com').toString('base64url');
  for (const tijd of ['NaN', 'Infinity', '0', '-1']) {
    const token = teken(`${email}.${tijd}`);
    assert.equal(leesSessie(token), null);
    assert.equal(await sessieGeldig(token, process.env.BOB_SESSION_SECRET!), false);
    assert.equal(leesInlogToken(teken(`${email}.${tijd}.nonce`)), null);
    assert.equal(leesState(teken(`${email}.${tijd}.nonce`)), null);
  }
  assert.equal(leesState(teken(`${email}.${Date.now() + 60_000}.nonce`)), null);
});

test('opslag: eenmalige tokens, gelijktijdige claims, verlopen beslissingen en storingen', async () => {
  const prototype = Object.getPrototypeOf(getStore({ name: 'test', siteID: process.env.NETLIFY_SITE_ID!, token: process.env.NETLIFY_AUTH_TOKEN! }));
  const rows = new Map<string, { data: unknown; etag: string }>();
  let version = 0;
  mock.method(prototype, 'get', async (key: string) => structuredClone(rows.get(key)?.data ?? null));
  mock.method(prototype, 'getWithMetadata', async (key: string) => structuredClone(rows.get(key) ?? null));
  mock.method(prototype, 'setJSON', async (key: string, data: unknown, options: { onlyIfNew?: boolean; onlyIfMatch?: string } = {}) => {
    const old = rows.get(key);
    if ((options.onlyIfNew && old) || (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)) return { modified: false };
    const etag = String(++version);
    rows.set(key, { data: structuredClone(data), etag });
    return { modified: true, etag };
  });
  mock.method(prototype, 'list', async function* () { yield { blobs: [...rows.keys()].map(key => ({ key })) }; });
  try {
    const { eersteKeer, teVaak, schrijf } = await import('../lib/blobs');
    assert.deepEqual((await Promise.all([eersteKeer('token'), eersteKeer('token')])).sort(), [false, true]);
    assert.deepEqual((await Promise.all([teVaak('limit', 1, 60_000), teVaak('limit', 1, 60_000)])).sort(), [false, true]);
    rows.clear();
    const { volgendeJob, beantwoordBevestiging, meldResultaat } = await import('../lib/bridge');
    const gebruiker = 'a@example.com';
    const id = '00000000-0000-4000-8000-000000000000';
    const key = `a_example_com/${id}`;
    const job = { id, gebruiker, soort: 'browser_click', invoer: {}, status: 'wacht', bevestigingNodig: true, bevestigd: null, aangemaakt: Date.now(), verlooptOp: Date.now() + 60_000 };
    await schrijf('queue', key, job);
    assert.equal(await volgendeJob(gebruiker), null);
    await beantwoordBevestiging(gebruiker, id, true);
    await assert.rejects(beantwoordBevestiging(gebruiker, id, false));
    const claims = await Promise.all([volgendeJob(gebruiker), volgendeJob(gebruiker)]);
    assert.equal(claims.filter(Boolean).length, 1);
    await meldResultaat(gebruiker, id, true, { done: true });
    await assert.rejects(meldResultaat(gebruiker, id, true));
    await schrijf('queue', key, { ...job, verlooptOp: Date.now() - 1 });
    await assert.rejects(beantwoordBevestiging(gebruiker, id, true));
    mock.method(prototype, 'setJSON', async () => { throw new Error('offline'); });
    await assert.rejects(eersteKeer('new-token'), { status: 503 });
    await assert.rejects(schrijf('queue', key, job), { status: 503 });
  } finally { mock.restoreAll(); }
});
