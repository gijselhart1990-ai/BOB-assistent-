import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { chatStore } from '../lib/chat-store';

test('chatopslag versleutelt complete beurten en scheidt eigenaar, account en omgeving', async () => {
  const names = ['DATABASE_URL', 'BOB_ACCOUNT_ENCRYPTION_KEY', 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF'];
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, { DATABASE_URL: 'postgresql://test:test@db.example.test/test', BOB_ACCOUNT_ENCRYPTION_KEY: 'ab'.repeat(32), VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test-a' });
  const rows: string[][] = [];
  let offline = false;
  const fetchMock = mock.method(global, 'fetch', async (_url: unknown, init: RequestInit) => {
    if (offline) throw new Error('offline');
    const { query, params } = JSON.parse(String(init.body));
    assert.equal(init.cache, 'no-store');
    if (query.startsWith('INSERT')) {
      assert.equal(params.length, 5);
      assert.ok(!params[4].includes('fictieve vraag'));
      rows.push(params);
      return Response.json({ fields: [], rows: [] });
    }
    assert.ok(query.includes('environment=$1 AND owner_id=$2 AND google_subject=$3'));
    const matching = rows.filter(r => r[1] === params[0] && r[2] === params[1] && r[3] === params[2]).slice(-25).reverse();
    return Response.json({ fields: [{ name: 'id', dataTypeID: 25 }, { name: 'ciphertext', dataTypeID: 25 }], rows: matching.map(r => [r[0], r[4]]) });
  });
  try {
    const a = chatStore('owner-a', 'account-a');
    await a.save('fictieve vraag', 'antwoord');
    assert.equal(rows.length, 1);
    assert.deepEqual(await a.list(), [{ rol: 'user', inhoud: 'fictieve vraag' }, { rol: 'assistant', inhoud: 'antwoord' }]);
    assert.deepEqual(await chatStore('owner-b', 'account-a').list(), []);
    assert.deepEqual(await chatStore('owner-a', 'account-b').list(), []);
    process.env.VERCEL_GIT_COMMIT_REF = 'test-b';
    assert.deepEqual(await chatStore('owner-a', 'account-a').list(), []);
    process.env.VERCEL_GIT_COMMIT_REF = 'test-a';
    await a.save('tweede vraag', 'tweede antwoord');
    assert.equal((await a.list())[2].inhoud, 'tweede vraag');
    rows[0][4] = rows[1][4];
    await assert.rejects(a.list());
    offline = true;
    await assert.rejects(a.save('niet opgeslagen', 'antwoord'));
    await assert.rejects(a.list());
    assert.equal(rows.length, 2);
  } finally {
    fetchMock.mock.restore();
    for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name]; }
  }
});
