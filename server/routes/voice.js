import express from 'express';
import multer from 'multer';
import { speak, transcribe, selftest, voiceReady } from '../services/cartesia.js';
import { briefingText } from '../connectors/index.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const voiceRouter = express.Router();

voiceRouter.get('/status', (req, res) => {
  res.json({ ready: voiceReady() });
});

voiceRouter.get('/selftest', async (req, res) => {
  res.json(await selftest());
});

/** Tekst -> audio. Antwoordt met een mp3-stream die de browser direct afspeelt. */
voiceRouter.post('/speak', async (req, res) => {
  try {
    const { text, speed, emotion } = req.body || {};
    const audio = await speak(text, { speed, emotion });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audio.length);
    res.setHeader('Cache-Control', 'no-store');
    res.end(audio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** De gesproken dagbriefing als één audiobestand. */
voiceRouter.get('/briefing', async (req, res) => {
  try {
    const text = await briefingText();
    if (req.query.format === 'text') return res.json({ text });
    const audio = await speak(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="bob-briefing.mp3"');
    res.end(audio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Audio -> tekst. De browser stuurt hier zijn microfoonopname naartoe. */
voiceRouter.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Geen audio ontvangen' });
    const result = await transcribe(req.file.buffer, req.file.originalname || 'opname.webm');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
