import express from 'express';
import { agent } from '../services/agent.js';

export const agentRouter = express.Router();

const guard = (handler) => async (req, res) => {
  try { res.json(await handler(req, res)); }
  catch (err) { res.status(400).json({ ok: false, error: err.message }); }
};

agentRouter.get('/status', guard(() => ({ ok: true, ...agent.status() })));

agentRouter.post('/jobs', guard((req) => ({ ok: true, job: agent.submit(req.body?.instruction) })));
agentRouter.post('/jobs/:id/run', guard(async (req) => ({ ok: true, job: await agent.run(req.params.id) })));
agentRouter.post('/jobs/:id/cancel', guard((req) => ({ ok: true, job: agent.cancel(req.params.id) })));

agentRouter.post('/memory', guard((req) => ({ ok: true, item: agent.remember(req.body?.text) })));
agentRouter.delete('/memory/:id', guard((req) => ({ ok: agent.forget(req.params.id) })));
