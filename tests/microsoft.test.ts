import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test, mock } from 'node:test';
import { maakMicrosoftAanmelding, leesMicrosoftAanmelding } from '../lib/microsoft-oauth';
import { microsoftIdentiteit, microsoftToken } from '../lib/oauth-validation';
import { microsoftAccountStore } from '../lib/microsoft-account-store';
import { deploymentConfiguratie } from '../lib/deployment';

test('Microsoft-aanmelding bindt PKCE aan eigenaar, cookie, state, werkcontext en vervaltijd', () => {
  const secret = 'test-secret-met-minstens-tweeendertig-tekens';
  const login = maakMicrosoftAanmelding('owner', 'context-a', secret);
  const data = leesMicrosoftAanmelding(login.cookie, login.state, 'owner', 'context-a', secret);
  assert.equal(createHash('sha256').update(data.verifier).digest('base64url'), login.challenge);
  assert.ok(!login.cookie.includes(data.verifier));
  for (const args of [
    ['', login.state, 'owner', 'context-a', secret],
    [login.cookie, 'andere-state', 'owner', 'context-a', secret],
    [login.cookie, login.state, 'ander', 'context-a', secret],
    [login.cookie, login.state, 'owner', 'context-b', secret],
    [login.cookie, login.state, 'owner', '', secret],
    [login.cookie, login.state, 'owner', 'context-a', secret + 'ander'],
  ]) assert.throws(() => leesMicrosoftAanmelding(args[0], args[1], args[2], args[3], args[4]));
  const now = mock.method(Date, 'now', () => data.expires);
  try { assert.throws(() => leesMicrosoftAanmelding(login.cookie, login.state, 'owner', 'context-a', secret)); }
  finally { now.mock.restore(); }
});

test('Microsoft weigert verkeerde mailbox en ontbrekende leestoestemming; behoudt refresh bij rotatie', () => {
  const id = '11111111-2222-3333-4444-555555555555';
  assert.deepEqual(microsoftIdentiteit({ id, mail: 'MAIL@example.test' }, 'mail@example.test'), { subject: id, email: 'mail@example.test' });
  assert.throws(() => microsoftIdentiteit({ id, mail: 'ander@example.test', userPrincipalName: 'mail@example.test' }, 'mail@example.test'));
  assert.throws(() => microsoftIdentiteit({ mail: 'mail@example.test' }, 'mail@example.test'));
  const previous = microsoftToken({ access_token: 'a', refresh_token: 'r1', scope: 'User.Read Mail.Read Calendars.Read', expires_in: 3600 });
  assert.equal(microsoftToken({ access_token: 'b' }, previous).refresh_token, 'r1');
  assert.equal(microsoftToken({ access_token: 'c', refresh_token: 'r2' }, previous).refresh_token, 'r2');
  for (const value of [null, {}, { access_token: 'a', scope: previous.scope },
    { access_token: 'a', refresh_token: 'r', scope: 'User.Read' }, { access_token: 'a', expires_in: -1 }]) {
    assert.throws(() => microsoftToken(value));
  }
});

test('Microsoft-preview gebruikt uitsluitend expliciete previewconfiguratie', () => {
  const source = { VERCEL_ENV: 'preview', MICROSOFT_CLIENT_SECRET: 'productie', MICROSOFT_CLIENT_ID: 'prod',
    MICROSOFT_ACCOUNT_EMAIL: 'prod@example.test', MICROSOFT_CONTEXT_EMAIL: 'prod-context@example.test', MICROSOFT_TENANT: 'prod' };
  const empty = deploymentConfiguratie(source);
  for (const field of ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT', 'ACCOUNT_EMAIL', 'CONTEXT_EMAIL']) assert.equal(empty[`MICROSOFT_${field}`], '');
  assert.equal(deploymentConfiguratie({ ...source, BOB_PREVIEW_MICROSOFT_CLIENT_SECRET: 'preview' }).MICROSOFT_CLIENT_SECRET, 'preview');
});

test('Outlook-opslag scheidt werkcontexten, versleutelt tokens en weigert verouderde updates', async () => {
  const names = ['DATABASE_URL', 'BOB_ACCOUNT_ENCRYPTION_KEY', 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF'];
  const old = Object.fromEntries(names.map(n => [n, process.env[n]]));
  Object.assign(process.env, { DATABASE_URL: 'postgresql://test:test@db.example.test/test', BOB_ACCOUNT_ENCRYPTION_KEY: 'ab'.repeat(32), VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test-a' });
  const rows: string[][] = [];
  let offline = false;
  const response = (fields: string[], data: string[][]) => Response.json({ fields: fields.map(name => ({ name, dataTypeID: 25 })), rows: data });
  const fetchMock = mock.method(global, 'fetch', async (_url: unknown, init: RequestInit) => {
    if (offline) throw new Error('offline');
    const { query, params: p } = JSON.parse(String(init.body));
    assert.equal(init.cache, 'no-store');
    if (query.startsWith('INSERT')) {
      assert.ok(!p[6].includes('test-access'));
      rows.push(p);
      return response([], []);
    }
    if (query.startsWith('UPDATE')) {
      const row = rows.find(r => r[0] === p[2] && r[1] === p[3] && r[2] === p[4] && r[3] === p[5] && r[4] === p[6] && r[7] === p[7]);
      if (!row) return response(['version'], []);
      row[6] = p[0]; row[7] = p[1];
      return response(['version'], [[p[1]]]);
    }
    assert.ok(query.includes('environment=$1 AND owner_id=$2 AND google_subject=$3'));
    return response(['tenant_id', 'microsoft_subject', 'email', 'token_ciphertext', 'version'],
      rows.filter(r => r[0] === p[0] && r[1] === p[1] && r[2] === p[2]).map(r => [r[3], r[4], r[5], r[6], r[7]]));
  });
  try {
    const store = microsoftAccountStore('owner-a', 'context-a');
    const account = { tenant: 'tenant', subject: 'ms-a', email: 'a@example.test', token: { access_token: 'test-access', refresh_token: 'test-refresh' } };
    await store.save(account);
    const saved = (await store.read())!;
    assert.equal(saved.token.refresh_token, 'test-refresh');
    assert.equal(await microsoftAccountStore('owner-b', 'context-a').read(), null);
    assert.equal(await microsoftAccountStore('owner-a', 'context-b').read(), null);
    process.env.VERCEL_GIT_COMMIT_REF = 'test-b';
    assert.equal(await microsoftAccountStore('owner-a', 'context-a').read(), null);
    process.env.VERCEL_GIT_COMMIT_REF = 'test-a';
    assert.equal(await store.save({ ...account, token: { access_token: 'fresh', refresh_token: 'rotated' } }, saved.version), true);
    assert.equal(await store.save(account, saved.version), false);
    assert.equal((await store.read())!.token.refresh_token, 'rotated');
    rows[0][4] = 'andere-identiteit';
    await assert.rejects(store.read());
    offline = true;
    await assert.rejects(store.read());
    await assert.rejects(store.save(account));
  } finally {
    fetchMock.mock.restore();
    for (const n of names) { if (old[n] === undefined) delete process.env[n]; else process.env[n] = old[n]; }
  }
});
