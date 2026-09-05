import { config } from '../config.js';
import { demo } from '../demo.js';
import { google } from './google.js';
import { microsoft } from './microsoft.js';
import { todoist } from './todoist.js';
import { whatsapp } from './whatsapp.js';
import { social } from './social.js';

export { google, microsoft, todoist, whatsapp, social };

const settle = async (promise, fallback) => {
  try { return await promise; } catch (err) { return { ...fallback, ok: false, error: err.message }; }
};

/** Eén agenda uit alle bronnen, op tijd gesorteerd. */
export async function unifiedAgenda(offsetDays = 0) {
  const [g, m] = await Promise.all([
    settle(google.agenda(offsetDays), { reason: 'error' }),
    settle(microsoft.agenda(offsetDays), { reason: 'error' }),
  ]);
  const events = [...(g.events || []), ...(m.events || [])]
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
  return {
    ok: Boolean(g.ok || m.ok),
    sources: { google: g.ok ? 'ok' : g.reason || 'uit', microsoft: m.ok ? 'ok' : m.reason || 'uit' },
    events,
  };
}

/** Ongelezen mail uit Gmail en Outlook naast elkaar. */
export async function unifiedMail() {
  const [g, m] = await Promise.all([
    settle(google.mail(), { reason: 'error' }),
    settle(microsoft.mail(), { reason: 'error' }),
  ]);
  return {
    ok: Boolean(g.ok || m.ok),
    gmail: g,
    outlook: m,
    totalUnread: (g.unread || 0) + (m.unread || 0),
  };
}

const timeOf = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(config.locale, {
      hour: '2-digit', minute: '2-digit', timeZone: config.timezone,
    });
  } catch { return ''; }
};

/**
 * Alles wat BOB nú weet, als platte tekst.
 * Dit gaat als context mee naar Claude en is de basis voor de gesproken briefing.
 */
export async function liveContext() {
  // In demomodus dezelfde gegevens gebruiken als het dashboard toont, anders
  // zegt BOB hardop "je agenda is niet gekoppeld" terwijl er afspraken op het
  // scherm staan.
  const [agenda, mail, tasks, wa, drive] = config.demo
    ? [demo.agenda, demo.mail, demo.todoist, demo.whatsapp, { ok: false, reason: 'demo' }]
    : await Promise.all([
      settle(unifiedAgenda(0), {}),
      settle(unifiedMail(), {}),
      settle(todoist.panel(), {}),
      settle(whatsapp.panel(), {}),
      settle(google.drive(), {}),
    ]);

  const lines = [];

  lines.push('AGENDA VANDAAG:');
  if (agenda.ok && agenda.events?.length) {
    for (const ev of agenda.events) {
      lines.push(`- ${ev.allDay ? 'hele dag' : timeOf(ev.start)} ${ev.title}${ev.location ? ` (${ev.location})` : ''} [${ev.calendar}]`);
    }
  } else {
    lines.push(agenda.ok ? '- geen afspraken' : '- agenda niet verbonden');
  }

  lines.push('', 'ONGELEZEN MAIL:');
  const gm = mail.gmail?.messages || [];
  const om = mail.outlook?.messages || [];
  if (gm.length || om.length) {
    for (const m of [...gm, ...om].slice(0, 8)) lines.push(`- ${m.from}: ${m.subject}`);
  } else {
    lines.push(mail.ok ? '- geen ongelezen mail' : '- mail niet verbonden');
  }

  lines.push('', 'TAKEN:');
  if (tasks.ok) {
    const { overdue = [], today = [] } = tasks.groups || {};
    if (overdue.length) lines.push(`- over tijd (${overdue.length}): ${overdue.map((t) => t.content).join('; ')}`);
    if (today.length) lines.push(`- vandaag (${today.length}): ${today.map((t) => t.content).join('; ')}`);
    if (!overdue.length && !today.length) lines.push('- niets openstaand voor vandaag');
  } else {
    lines.push('- Todoist niet verbonden');
  }

  if (wa.ok) {
    lines.push('', `WHATSAPP: ${wa.badge} ongelezen` +
      (wa.chats?.length ? ` van ${wa.chats.filter((c) => c.unread).map((c) => c.name).join(', ')}` : ''));
  }

  lines.push('', 'RECENTE BESTANDEN IN GOOGLE DRIVE:');
  if (drive.ok && drive.items?.length) {
    for (const file of drive.items.slice(0, 8)) lines.push(`- ${file.name} (${file.account})`);
  } else {
    lines.push('- Google Drive niet verbonden');
  }

  return lines.join('\n');
}

/** Korte, uitspreekbare ochtendbriefing. */
export async function briefingText() {
  const [agenda, mail, tasks] = config.demo
    ? [demo.agenda, demo.mail, demo.todoist]
    : await Promise.all([
      settle(unifiedAgenda(0), {}),
      settle(unifiedMail(), {}),
      settle(todoist.panel(), {}),
    ]);

  const now = new Date();
  const hour = Number(now.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: config.timezone }));
  const groet = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Goedemiddag' : 'Goedenavond';
  const datum = now.toLocaleDateString(config.locale, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: config.timezone,
  });

  const zinnen = [`${groet} ${config.user}. Het is ${datum}.`];

  const events = agenda.events || [];
  if (!agenda.ok) zinnen.push('Je agenda is nog niet gekoppeld.');
  else if (!events.length) zinnen.push('Je hebt vandaag geen afspraken staan.');
  else {
    const eerste = events[0];
    zinnen.push(
      `Je hebt ${events.length} ${events.length === 1 ? 'afspraak' : 'afspraken'}. ` +
      `De eerste is ${eerste.title}${eerste.allDay ? ' de hele dag' : ` om ${timeOf(eerste.start)}`}.`
    );
    if (events.length > 1) {
      const rest = events.slice(1, 4).map((e) => `${timeOf(e.start)} ${e.title}`).join(', ');
      zinnen.push(`Daarna: ${rest}.`);
    }
  }

  if (tasks.ok) {
    const over = tasks.groups?.overdue?.length || 0;
    const vandaag = tasks.groups?.today?.length || 0;
    if (over) zinnen.push(`Let op: ${over} ${over === 1 ? 'taak staat' : 'taken staan'} over tijd.`);
    if (vandaag) zinnen.push(`Voor vandaag staan er ${vandaag} taken open. Belangrijkste: ${tasks.groups.today[0].content}.`);
    if (!over && !vandaag) zinnen.push('Je takenlijst is leeg voor vandaag.');
  }

  if (mail.ok && mail.totalUnread) {
    zinnen.push(`Er ${mail.totalUnread === 1 ? 'wacht 1 ongelezen mail' : `wachten ${mail.totalUnread} ongelezen mails`}.`);
  }

  return zinnen.join(' ');
}
