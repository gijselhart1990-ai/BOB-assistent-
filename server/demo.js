/**
 * Demomodus (BOB_DEMO=1).
 *
 * Laat het dashboard zien zoals het eruitziet als álles gekoppeld is,
 * zonder dat je eerst door vier OAuth-schermen moet. De data hieronder
 * is verzonnen en het dashboard zegt dat er ook bij — BOB doet nooit
 * alsof nepdata echt is.
 */

const iso = (h, m = 0, dayOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const dateStr = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const demo = {
  agenda: {
    ok: true,
    demo: true,
    sources: { google: 'demo', microsoft: 'demo' },
    events: [
      { id: 'd1', title: 'Intake nieuwe cliënt', start: iso(9, 30), end: iso(10, 15), location: 'Praktijk Amersfoort', calendar: 'Standup Zorg', color: '#1a9464' },
      { id: 'd2', title: 'PMT-sessie groep 3', start: iso(11, 0), end: iso(12, 0), location: 'Gymzaal', calendar: 'Standup Zorg', color: '#1a9464' },
      { id: 'd3', title: 'Bellen met Mischa — offerte ATLAS', start: iso(13, 30), end: iso(14, 0), location: null, calendar: 'Hart & Oost', color: '#d97706' },
      { id: 'd4', title: 'Training O8', start: iso(17, 0), end: iso(18, 15), location: 'Sportpark D.O.S.C.', calendar: 'D.O.S.C.', color: '#2563eb' },
    ],
  },

  mail: {
    ok: true,
    demo: true,
    totalUnread: 7,
    gmail: {
      ok: true, unread: 4,
      messages: [
        { id: 'g1', from: 'Lucinda Looijenga', subject: 'Maandfacturen — concept staat klaar', snippet: '', date: iso(11, 12), link: '#' },
        { id: 'g2', from: 'Gemeente Amersfoort', subject: 'Beschikking jeugdhulp 2026', snippet: '', date: iso(10, 4), link: '#' },
        { id: 'g3', from: 'SnelStart', subject: 'Je factuurexport is gereed', snippet: '', date: iso(9, 21), link: '#' },
      ],
    },
    outlook: {
      ok: true, unread: 3,
      messages: [
        { id: 'o1', from: 'Eemhart – Roosterbureau', subject: 'Wijziging dienst donderdag', snippet: '', date: iso(11, 44), link: '#' },
        { id: 'o2', from: 'Mischa Oosterwijk', subject: 'Re: douanetarieven Q4', snippet: '', date: iso(10, 30), link: '#' },
        { id: 'o3', from: 'D.O.S.C. Jeugdcommissie', subject: 'Teamindeling O8 — akkoord?', snippet: '', date: iso(8, 55), link: '#' },
      ],
    },
  },

  todoist: {
    ok: true, demo: true, open: 11, badge: 4,
    groups: {
      overdue: [{ id: 't0', content: 'Declarabele uren augustus afronden', dueString: 'gisteren', due: dateStr(-1) }],
      today: [
        { id: 't1', content: 'Maandfacturen naar SnelStart', dueString: 'vandaag', due: dateStr(0) },
        { id: 't2', content: 'Terugkoppeling intake sturen', dueString: 'vandaag', due: dateStr(0) },
        { id: 't3', content: 'Offerte ATLAS nakijken', dueString: 'vandaag', due: dateStr(0) },
      ],
      tomorrow: [
        { id: 't4', content: 'Website Standup Zorg — teksten', dueString: 'morgen', due: dateStr(1) },
        { id: 't5', content: 'Trainingsschema O8 delen', dueString: 'morgen', due: dateStr(1) },
      ],
      later: [
        { id: 't6', content: 'Kwartaalgesprek Lucinda voorbereiden', dueString: 'volgende week ma', due: dateStr(4) },
        { id: 't7', content: 'BTW-aangifte Q3', dueString: 'over 2 weken', due: dateStr(14) },
      ],
      someday: [
        { id: 't8', content: 'Hexagon Modulair — leveranciers vergelijken' },
        { id: 't9', content: 'Nieuwe PMT-materialen uitzoeken' },
      ],
    },
    counts: { overdue: 1, today: 3, tomorrow: 2, later: 3, someday: 2 },
  },

  whatsapp: {
    ok: true, demo: true, status: 'demo', badge: 3,
    chats: [
      { id: 'w1', name: 'Lucinda Looijenga', unread: 2, group: false, lastMessage: 'Zullen we morgen om 10:00 bellen?', timestamp: Date.now() - 26e5 },
      { id: 'w2', name: 'Mischa Oosterwijk', unread: 1, group: false, lastMessage: 'Bedankt voor het document!', timestamp: Date.now() - 51e5 },
      { id: 'w3', name: 'D.O.S.C. O8 ouders', unread: 0, group: true, lastMessage: 'Wie rijdt er zaterdag?', timestamp: Date.now() - 88e5 },
      { id: 'w4', name: 'Lisa', unread: 0, group: false, lastMessage: 'Laten we vrijdag lunchen?', timestamp: Date.now() - 9e7 },
    ],
  },

  social: {
    ok: true, demo: true,
    items: [
      { id: 'linkedin', label: 'LinkedIn', ok: true, value: 12, unit: 'nieuw' },
      { id: 'instagram', label: 'Instagram', ok: true, value: 8, unit: 'nieuw' },
      { id: 'facebook', label: 'Facebook', ok: true, value: 5, unit: 'meldingen' },
      { id: 'tiktok', label: 'TikTok', ok: true, value: 9, unit: 'nieuw' },
    ],
  },
};
