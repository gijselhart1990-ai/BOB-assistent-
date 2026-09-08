import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test, mock } from 'node:test';
import { beslissing, internPad } from '../lib/validation';
import { publiekAdres, controleerDoel } from '../lib/web/fetch-public';
import { requiresApproval } from '../lib/foundation/policy';
import { deploymentConfiguratie, opslagOmgeving } from '../lib/deployment';

process.env.BOB_SESSION_SECRET = 'test-secret-met-minstens-tweeendertig-tekens';
process.env.KV_REST_API_URL = 'https://redis.example.test';
process.env.KV_REST_API_TOKEN = 'test-only';

test('preview isoleert opslag en erft geen externe productieverbindingen', () => {
  const bron = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test-branch', XANO_METADATA_TOKEN: 'production-placeholder', RESEND_API_KEY: 'mailer-placeholder', BOB_SESSION_SECRET: 'session-placeholder' };
  const config = deploymentConfiguratie(bron);
  assert.equal(config.XANO_METADATA_TOKEN, '');
  assert.equal(config.RESEND_API_KEY, '');
  assert.equal(config.BOB_SESSION_SECRET, bron.BOB_SESSION_SECRET);
  assert.equal(bron.XANO_METADATA_TOKEN, 'production-placeholder');
  assert.equal(opslagOmgeving(bron), 'test-branch');
  assert.equal(opslagOmgeving({ VERCEL_ENV: 'production' }), null);
  assert.equal(deploymentConfiguratie({ ...bron, VERCEL_ENV: 'production' }).XANO_METADATA_TOKEN, bron.XANO_METADATA_TOKEN);
  assert.equal(deploymentConfiguratie({ ...bron, BOB_PREVIEW_INTEGRATIONS: 'enabled' }).XANO_METADATA_TOKEN, bron.XANO_METADATA_TOKEN);
});

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
  const rows = new Map<string, string>();
  let offline = false;
  mock.method(global, 'fetch', async (_url: unknown, init: RequestInit) => {
    if (offline) throw new Error('offline');
    const args = JSON.parse(String(init.body)) as (string | number)[];
    let result: unknown;
    const key = String(args[1]);
    if(args[0] === 'GET') result = rows.get(key) ?? null;
    else if(args[0] === 'SET') {
      if(args.includes('NX') && rows.has(key)) result = null;
      else { rows.set(key, String(args[2])); result = 'OK'; }
      assert.ok(args.includes('EX'));
    } else if(args[0] === 'SCAN') result = ['0', [...rows.keys()].filter(k => k.startsWith(String(args[3]).slice(0,-1)))];
    else if(args[0] === 'EVAL') {
      const old = rows.get(String(args[3]));
      const expected = args[4];
      const matches = expected === '' ? !old : old && JSON.parse(old).versie === expected;
      result = matches ? 1 : 0;
      if(matches) rows.set(String(args[3]), String(args[5]));
    } else throw new Error('Onverwacht commando');
    return Response.json({result});
  });
  try {
    const { eersteKeer, teVaak, schrijf } = await import('../lib/storage');
    assert.deepEqual((await Promise.all([eersteKeer('token'), eersteKeer('token')])).sort(), [false, true]);
    assert.deepEqual((await Promise.all([teVaak('limit', 1, 60_000), teVaak('limit', 1, 60_000)])).sort(), [false, true]);
    rows.clear();
    const { volgendeJob, beantwoordBevestiging, meldResultaat } = await import('../lib/bridge');
    const gebruiker = 'a@example.com';
    const id = '00000000-0000-4000-8000-000000000000';
    const key = `a_example_com/${id}`;
    const job = { id, gebruiker, soort: 'browser_click', invoer: {}, status: 'wacht', bevestigingNodig: true, bevestigd: null, aangemaakt: Date.now(), verlooptOp: Date.now() + 60_000 };
    await schrijf('bob-wachtrij', key, job);
    assert.equal(await volgendeJob(gebruiker), null);
    await beantwoordBevestiging(gebruiker, id, true);
    await assert.rejects(beantwoordBevestiging(gebruiker, id, false));
    const claims = await Promise.all([volgendeJob(gebruiker), volgendeJob(gebruiker)]);
    assert.equal(claims.filter(Boolean).length, 1);
    await meldResultaat(gebruiker, id, true, { done: true });
    await assert.rejects(meldResultaat(gebruiker, id, true));
    await schrijf('bob-wachtrij', key, { ...job, verlooptOp: Date.now() - 1 });
    await assert.rejects(beantwoordBevestiging(gebruiker, id, true));
    offline = true;
    await assert.rejects(eersteKeer('new-token'), { status: 503 });
    await assert.rejects(schrijf('bob-wachtrij', key, job), { status: 503 });
  } finally { mock.restoreAll(); }
});
