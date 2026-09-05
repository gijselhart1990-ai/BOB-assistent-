import express from 'express';
import path from 'node:path';
import { config, PUBLIC_DIR, ROOT, capabilities } from './config.js';
import { voiceRouter } from './routes/voice.js';
import { chatRouter } from './routes/chat.js';
import { panelsRouter } from './routes/panels.js';
import { oauthRouter } from './routes/oauth.js';
import { agentRouter } from './routes/agent.js';
import { store } from './store.js';

// Eén kapotte connector mag nooit het hele dashboard meenemen.
// WhatsApp/puppeteer gooit fouten soms buiten elke await om; zonder deze
// twee vangnetten stopt Node daar standaard mee.
process.on('unhandledRejection', (reason) => {
  console.error('\x1b[33m[BOB]\x1b[0m onafgehandelde fout in een connector:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('\x1b[33m[BOB]\x1b[0m onverwachte fout, BOB blijft draaien:', err?.message || err);
});

const app = express();

app.use(express.json({ limit: '2mb' }));

// BOB draait lokaal. Alleen verkeer van deze machine mag erbij —
// dat scheelt een hoop nadenken over authenticatie.
app.use((req, res, next) => {
  const ip = req.socket.remoteAddress || '';
  const local = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!local) return res.status(403).json({ error: 'BOB luistert alleen naar deze computer' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use('/api/voice', voiceRouter);
app.use('/api/chat', chatRouter);
app.use('/api/agent', agentRouter);
app.use('/api', panelsRouter);
app.use('/oauth', oauthRouter);

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
app.get('*', (req, res) => res.sendFile(`${PUBLIC_DIR}/index.html`));

await store.initialize();

const server = app.listen(config.port, '127.0.0.1', () => {
  const caps = capabilities();
  const mark = (on) => (on ? '\x1b[32m●\x1b[0m' : '\x1b[90m○\x1b[0m');
  console.log(`
\x1b[1m\x1b[32m  ${config.name}\x1b[0m is wakker.

  Dashboard   http://localhost:${config.port}
  Map         ${ROOT}
  Config      ${path.join(ROOT, '.env')}${config.demo ? '   \x1b[33m(DEMOMODUS — BOB_DEMO=1)\x1b[0m' : ''}

  ${mark(caps.voice)} Stem (Cartesia)      ${mark(caps.brain)} Brein (Claude)
  ${mark(caps.google)} Google               ${mark(caps.microsoft)} Outlook
  ${mark(caps.todoist)} Todoist              ${mark(caps.whatsapp)} WhatsApp
  ${mark(caps.social)} Social                ${mark(caps.xano)} Xano data

  Grijs = nog niet ingesteld. Zie INSTALL.md, stap voor stap.
`);
});

// Zonder deze handler zou het vangnet voor uncaughtException hierboven een
// bezette poort stilzwijgend opslokken — dan lijkt BOB te draaien terwijl
// een oude instantie nog op de poort zit met een verouderde .env.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`
\x1b[31m  Poort ${config.port} is al bezet.\x1b[0m Er draait waarschijnlijk nog een BOB
  in een ander venster — sluit dat eerst (Ctrl+C), of kies een andere PORT in .env.
`);
  } else {
    console.error(`\n\x1b[31m  BOB kon niet starten:\x1b[0m ${err.message}\n`);
  }
  process.exit(1);
});

const shutdown = () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
