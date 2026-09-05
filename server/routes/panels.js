import express from 'express';
import { config, capabilities } from '../config.js';
import {
  google, microsoft, todoist, whatsapp, social,
  unifiedAgenda, unifiedMail, briefingText,
} from '../connectors/index.js';
import { invalidate } from '../store.js';
import { demo } from '../demo.js';
import { status as xanoStatus } from '../services/xano.js';

export const panelsRouter = express.Router();

const guard = (handler) => async (req, res) => {
  try { res.json(await handler(req)); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
};

panelsRouter.get('/status', guard(async () => ({
  ok: true,
  name: config.name,
  user: config.user,
  timezone: config.timezone,
  capabilities: capabilities(),
  connected: {
    google: google.connected(),
    microsoft: microsoft.connected(),
    todoist: todoist.configured(),
    whatsapp: whatsapp.configured(),
    social: social.configured(),
    xano: xanoStatus(),
  },
})));

panelsRouter.get('/agenda', guard(async (req) => {
  if (config.demo) return demo.agenda;
  const offset = Number(req.query.offset || 0);
  return unifiedAgenda(Number.isFinite(offset) ? offset : 0);
}));

panelsRouter.get('/mail', guard(() => (config.demo ? demo.mail : unifiedMail())));
panelsRouter.get('/drive', guard(() => (config.demo ? { ok: false, reason: 'demo' } : google.drive())));
panelsRouter.get('/todoist', guard(() => (config.demo ? demo.todoist : todoist.panel())));
panelsRouter.get('/whatsapp', guard(() => (config.demo ? demo.whatsapp : whatsapp.panel())));
panelsRouter.get('/social', guard(() => (config.demo ? demo.social : social.panel())));
panelsRouter.get('/briefing', guard(async () => ({ ok: true, text: await briefingText() })));

panelsRouter.post('/todoist/:id/complete', guard(async (req) => {
  const result = await todoist.complete(req.params.id);
  invalidate('todoist');
  return result;
}));

/** Alles in één keer — het dashboard doet bij het laden precies één request. */
panelsRouter.get('/all', guard(async () => {
  if (config.demo) {
    return {
      ok: true, demo: true, at: Date.now(),
      capabilities: capabilities(),
      agenda: demo.agenda, mail: demo.mail, todoist: demo.todoist,
      whatsapp: demo.whatsapp, social: demo.social,
    };
  }
  const settle = async (p) => { try { return await p; } catch (e) { return { ok: false, error: e.message }; } };
  const [agenda, mail, tasks, wa, soc, drive] = await Promise.all([
    settle(unifiedAgenda(0)),
    settle(unifiedMail()),
    settle(todoist.panel()),
    settle(whatsapp.panel()),
    settle(social.panel()),
    settle(google.drive()),
  ]);
  return {
    ok: true,
    at: Date.now(),
    capabilities: capabilities(),
    agenda, mail, todoist: tasks, whatsapp: wa, social: soc, drive,
  };
}));

panelsRouter.post('/refresh', guard(async () => { invalidate(''); return { ok: true }; }));
