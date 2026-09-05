import express from 'express';
import { config } from '../config.js';
import * as googleAuth from '../connectors/google.js';
import * as microsoftAuth from '../connectors/microsoft.js';
import { store, invalidate } from '../store.js';

export const oauthRouter = express.Router();

const page = (title, body) => `<!doctype html><meta charset="utf-8">
<title>${title}</title>
<style>
 body{font-family:system-ui,Segoe UI,sans-serif;background:#f6f8f7;color:#0f2e22;
      display:grid;place-items:center;min-height:100vh;margin:0}
 .card{background:#fff;border-radius:16px;padding:40px 48px;box-shadow:0 8px 30px rgba(0,0,0,.08);
       max-width:460px;text-align:center}
 h1{margin:0 0 12px;font-size:22px} p{margin:0 0 20px;line-height:1.6;color:#456}
 a{display:inline-block;background:#0d5138;color:#fff;text-decoration:none;
   padding:11px 22px;border-radius:9px;font-weight:600}
</style>
<div class="card">${body}</div>`;

oauthRouter.get('/google/start', (req, res) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    return res.status(400).send(page('Google', '<h1>Google is niet ingesteld</h1><p>Vul <code>GOOGLE_CLIENT_ID</code> en <code>GOOGLE_CLIENT_SECRET</code> in je <code>.env</code> en herstart BOB.</p><a href="/">Terug</a>'));
  }
  res.redirect(googleAuth.authorizeUrl());
});

oauthRouter.get('/google/callback', async (req, res) => {
  try {
    if (req.query.error) throw new Error(String(req.query.error));
    const account = await googleAuth.exchangeCode(String(req.query.code));
    invalidate('google');
    res.send(page('Google gekoppeld', `<h1>Google is gekoppeld ✅</h1><p>${account.email} is toegevoegd. Agenda, Gmail en Drive zijn nu beschikbaar in BOB.</p><p>Open de koppellink opnieuw om het volgende account toe te voegen.</p><a href="/">Terug naar het dashboard</a>`));
  } catch (err) {
    res.status(500).send(page('Fout', `<h1>Koppelen mislukt</h1><p>${err.message}</p><a href="/">Terug</a>`));
  }
});

oauthRouter.get('/microsoft/start', (req, res) => {
  if (!config.microsoft.clientId) {
    return res.status(400).send(page('Microsoft', '<h1>Microsoft is niet ingesteld</h1><p>Vul <code>MICROSOFT_CLIENT_ID</code> en <code>MICROSOFT_CLIENT_SECRET</code> in je <code>.env</code> en herstart BOB.</p><a href="/">Terug</a>'));
  }
  res.redirect(microsoftAuth.authorizeUrl());
});

oauthRouter.get('/microsoft/callback', async (req, res) => {
  try {
    if (req.query.error) throw new Error(String(req.query.error_description || req.query.error));
    await microsoftAuth.exchangeCode(String(req.query.code));
    invalidate('ms');
    res.send(page('Outlook gekoppeld', '<h1>Outlook is gekoppeld ✅</h1><p>Mail en agenda zijn nu beschikbaar in BOB.</p><a href="/">Terug naar het dashboard</a>'));
  } catch (err) {
    res.status(500).send(page('Fout', `<h1>Koppelen mislukt</h1><p>${err.message}</p><a href="/">Terug</a>`));
  }
});

oauthRouter.post('/:provider/disconnect', (req, res) => {
  const provider = req.params.provider;
  if (!['google', 'microsoft'].includes(provider)) return res.status(400).json({ error: 'onbekend' });
  if (provider === 'google') googleAuth.disconnectAll();
  else store.clearToken(provider);
  invalidate('');
  res.json({ ok: true });
});
