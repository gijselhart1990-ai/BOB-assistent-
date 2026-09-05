import express from 'express';
import { ask, brainReady } from '../services/anthropic.js';
import { liveContext } from '../connectors/index.js';
import { store } from '../store.js';

export const chatRouter = express.Router();

chatRouter.get('/status', (req, res) => res.json({ ready: brainReady() }));

chatRouter.get('/history', (req, res) => {
  res.json({ messages: store.read('conversation', []) });
});

chatRouter.delete('/history', (req, res) => {
  store.write('conversation', []);
  res.json({ ok: true });
});

/**
 * Eén vraag aan BOB. Hij krijgt altijd de actuele agenda, mail en taken mee,
 * zodat "wat staat er vandaag op mijn planning" gewoon werkt.
 */
chatRouter.post('/', async (req, res) => {
  try {
    const question = String(req.body?.message || '').trim();
    if (!question) return res.status(400).json({ error: 'Lege vraag' });

    const history = store.read('conversation', []);
    const context = req.body?.withContext === false ? '' : await liveContext();
    const { text, usage } = await ask(question, { history, liveContext: context });

    const updated = [
      ...history,
      { role: 'user', content: question, at: Date.now() },
      { role: 'assistant', content: text, at: Date.now() },
    ].slice(-40);
    store.write('conversation', updated);

    res.json({ text, usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
