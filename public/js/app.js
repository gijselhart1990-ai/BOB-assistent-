/* ============================================================
   BOB — dashboard
   Haalt één keer /api/all op, tekent de panelen en praat met /api/chat.
   ============================================================ */

import { voice } from './voice.js';

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const body   = (name) => $(`[data-body="${name}"]`);
const pill   = (name) => $(`[data-pill="${name}"]`);
const badge  = (name) => $(`[data-badge="${name}"]`);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const hhmm = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(+d) ? '' : d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
};
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/* dagen tellen op kalenderdatum, niet op 24-uursblokken — voorkomt
   verschuivingen rond zomertijd en werkt voor elke afstand in de tijd */
const dateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((dateOnly(a) - dateOnly(b)) / 86400000);
const toDateInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ---------------- toasts ---------------- */

function toast(message, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  $('#toasts').append(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 250); }, kind === 'err' ? 7000 : 3800);
}

/* ---------------- rendering ---------------- */

function notConnected(title, hint, connectHref) {
  return `<div class="notconnected"><b>${esc(title)}</b>${esc(hint)}
    ${connectHref ? `<a class="connect-btn" href="${connectHref}">Nu koppelen</a>` : ''}</div>`;
}

function renderAgenda(data) {
  const el = body('agenda');
  if (!data?.ok) {
    el.innerHTML = notConnected(
      'Agenda nog niet gekoppeld',
      'Koppel Google en/of Outlook om je afspraken hier te zien.',
      '/oauth/google/start'
    );
    return;
  }
  const events = data.events || [];
  if (!events.length) {
    const offset = daysBetween(selectedDate, new Date());
    const msg = offset === 0 ? 'Geen afspraken. Lekker.'
      : offset > 0 ? 'Geen afspraken op deze dag.'
      : 'Geen afspraken gevonden.';
    el.innerHTML = `<p class="empty">${msg}</p>`;
    return;
  }

  const now = Date.now();
  el.innerHTML = events.slice(0, 8).map((ev) => {
    const start = ev.start ? +new Date(ev.start) : 0;
    const end = ev.end ? +new Date(ev.end) : 0;
    const live = start && end && now >= start && now <= end;
    const mins = start && end ? Math.round((end - start) / 60000) : 0;
    const dur = ev.allDay ? 'hele dag'
      : mins >= 60 ? `${Math.floor(mins / 60)}u${mins % 60 ? ` ${mins % 60}m` : ''}`
      : `${mins}m`;
    return `<div class="slot ${live ? 'now' : ''}" style="--c:${esc(ev.color || '#3b82f6')}">
      <span class="slot-time">${ev.allDay ? '—' : esc(hhmm(ev.start))}</span>
      <span class="slot-rail"><span class="slot-dot"></span></span>
      <span>
        <div class="slot-title">${esc(ev.title)}</div>
        <div class="slot-sub">${esc(dur)}${ev.location ? ` · ${esc(ev.location)}` : ''} · ${esc(ev.calendar || '')}</div>
      </span>
    </div>`;
  }).join('');
  badge('agenda').dataset.count = events.length;
  badge('agenda').textContent = events.length;
}

function renderMail(data) {
  // Outlook-kaart
  const out = body('outlook');
  const o = data?.outlook;
  if (!o?.ok) {
    out.innerHTML = notConnected('Outlook nog niet gekoppeld', 'Koppel je Microsoft-account voor mail en agenda.', '/oauth/microsoft/start');
    pill('outlook').textContent = 'uit'; pill('outlook').className = 'pill muted';
  } else {
    const msgs = o.messages || [];
    out.innerHTML = msgs.length
      ? msgs.map((m) => `<a class="row" href="${esc(m.link || '#')}" target="_blank" rel="noopener">
          <span class="row-main">
            <span class="row-title"><span class="t">${esc(m.from)}</span></span>
            <span class="row-sub">${esc(m.subject)}</span>
          </span>
          <span class="row-side"><span class="row-time">${esc(hhmm(m.date))}</span></span>
        </a>`).join('')
      : '<p class="empty">Inbox leeg.</p>';
    pill('outlook').textContent = `${o.unread || 0} ongelezen`;
    pill('outlook').className = 'pill' + (o.unread ? '' : ' muted');
    badge('outlook').dataset.count = o.unread || 0;
    badge('outlook').textContent = o.unread || 0;
  }

  // Google-kaart met app-tegels
  const g = data?.gmail;
  const unread = g?.ok ? (g.unread || 0) : 0;
  const tiles = [
    { name: 'Gmail',    glyph: 'M', c: '#ea4335', href: 'https://mail.google.com',     badge: unread },
    { name: 'Agenda',   glyph: '31', c: '#1a73e8', href: 'https://calendar.google.com' },
    { name: 'Drive',    glyph: '▲', c: '#00ac47', href: 'https://drive.google.com' },
    { name: 'Foto\'s',  glyph: '✦', c: '#fbbc04', href: 'https://photos.google.com' },
  ];
  body('google').innerHTML = tiles.map((t) => `
    <a class="app-tile" href="${t.href}" target="_blank" rel="noopener" style="--c:${t.c}">
      ${t.badge ? `<span class="app-badge">${t.badge}</span>` : ''}
      <span class="app-glyph">${esc(t.glyph)}</span>
      <span class="app-name">${esc(t.name)}</span>
    </a>`).join('');
  const accountCount = g?.accounts?.length || 0;
  pill('google').textContent = g?.ok ? `${unread} ongelezen · ${accountCount} acc.` : 'niet gekoppeld';
  pill('google').className = 'pill' + (g?.ok && unread ? '' : ' muted');
  badge('gmail').dataset.count = unread;
  badge('gmail').textContent = unread;
}

function renderTodoist(data) {
  const el = body('todoist');
  if (!data?.ok) {
    // Onderscheid maken tussen "nog niet ingesteld" en "ingesteld maar het gaat mis".
    // Die twee door elkaar halen stuurt je de verkeerde kant op.
    const broken = data?.reason === 'error' || data?.error;
    el.innerHTML = notConnected(
      broken ? 'Todoist geeft een foutmelding' : 'Todoist nog niet gekoppeld',
      data?.hint || data?.error || 'Zet je API-token in .env en herstart BOB.'
    );
    pill('todoist').textContent = broken ? 'fout' : 'uit';
    pill('todoist').className = 'pill' + (broken ? ' alert' : ' muted');
    return;
  }
  const g = data.groups || {};
  const counts = data.counts || {};
  const group = (key, title, items, late = false) => {
    if (!items?.length) return '';
    const total = counts[key] ?? items.length;
    const more = total - items.length;
    return `
      <div class="task-group">
        <h3>${esc(title)} <em>${total}</em></h3>
        ${items.map((t) => `<div class="task" data-task="${esc(t.id)}">
          <input type="checkbox" aria-label="Afvinken">
          <label>${esc(t.content)}</label>
          ${t.dueString ? `<span class="task-due ${late ? 'late' : ''}">${esc(t.dueString)}</span>` : ''}
        </div>`).join('')}
        ${more > 0 ? `<a class="task-more" href="https://app.todoist.com" target="_blank" rel="noopener">+${more} meer in Todoist ↗</a>` : ''}
      </div>`;
  };

  el.innerHTML = [
    group('overdue', 'Over tijd', g.overdue, true),
    group('today', 'Vandaag', g.today),
    group('tomorrow', 'Morgen', g.tomorrow),
    group('later', 'Later', g.later),
    group('someday', 'Zonder datum', g.someday),
  ].join('') || '<p class="empty">Niets openstaand. Goed bezig.</p>';

  pill('todoist').textContent = `${data.open} taken open`;
  pill('todoist').className = 'pill';
  badge('todoist').dataset.count = data.badge || 0;
  badge('todoist').textContent = data.badge || 0;

  $$('.task input', el).forEach((box) => box.addEventListener('change', async (e) => {
    const row = e.target.closest('.task');
    row.classList.add('done');
    try {
      const res = await fetch(`/api/todoist/${row.dataset.task}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast('Taak afgevinkt', 'ok');
      setTimeout(() => row.remove(), 500);
    } catch {
      row.classList.remove('done'); e.target.checked = false;
      toast('Afvinken mislukt', 'err');
    }
  }));
}

function renderWhatsApp(data) {
  const el = body('whatsapp');
  if (!data?.ok) {
    const reason = data?.reason;
    const title = reason === 'connecting' ? 'WhatsApp verbindt…'
      : reason === 'error' ? 'WhatsApp kon niet starten'
      : 'WhatsApp nog niet gekoppeld';
    const hint = reason === 'connecting'
      ? 'De lokale WhatsApp-verbinding wordt voorbereid.'
      : 'Je WhatsApp-verbinding is nog niet actief. Bekijk de koppelpagina om verder te gaan.';
    el.innerHTML = notConnected(title, hint, '#koppelen');
    pill('whatsapp').textContent = reason === 'connecting' ? 'verbinden' : reason === 'error' ? 'fout' : 'uit';
    pill('whatsapp').className = 'pill' + (reason === 'error' ? ' alert' : ' muted');
    return;
  }
  const chats = data.chats || [];
  el.innerHTML = chats.length ? chats.map((c) => `
    <a class="row" href="https://web.whatsapp.com" target="_blank" rel="noopener">
      <span class="row-av">${esc(initials(c.name))}</span>
      <span class="row-main">
        <span class="row-title"><span class="t">${esc(c.name)}</span></span>
        <span class="row-sub">${esc(c.lastMessage || '—')}</span>
      </span>
      <span class="row-side">
        <span class="row-time">${esc(hhmm(c.timestamp))}</span>
        ${c.unread ? `<span class="count">${c.unread}</span>` : ''}
      </span>
    </a>`).join('') : '<p class="empty">Geen recente chats.</p>';

  pill('whatsapp').textContent = `${data.badge || 0} ongelezen`;
  pill('whatsapp').className = 'pill' + (data.badge ? '' : ' muted');
  badge('whatsapp').dataset.count = data.badge || 0;
  badge('whatsapp').textContent = data.badge || 0;
}

function renderSocial(data) {
  const colors = { linkedin: '#0a66c2', instagram: '#e1306c', facebook: '#1877f2', tiktok: '#111827' };
  const glyphs = { linkedin: 'in', instagram: '◎', facebook: 'f', tiktok: '♪' };
  const items = data?.items || [];
  body('social').innerHTML = items.map((p) => `
    <div class="app-tile" style="--c:${colors[p.id] || '#8b5cf6'}" title="${esc(p.ok ? '' : p.reason || '')}">
      <span class="app-glyph">${esc(glyphs[p.id] || '•')}</span>
      <span class="app-num">${p.ok ? esc(p.value) : '—'}</span>
      <span class="app-name">${esc(p.ok ? (p.unit || p.label) : 'niet gekoppeld')}</span>
    </div>`).join('') || '<p class="empty">Nog geen social-accounts gekoppeld.</p>';
}

function renderDrive(data) {
  const el = body('drive');
  if (!data?.ok) {
    el.innerHTML = notConnected('Google Drive nog niet gekoppeld', 'Koppel ten minste één Google-account om recente bestanden te zien.', '/oauth/google/start');
    pill('drive').textContent = 'uit'; pill('drive').className = 'pill muted';
    return;
  }
  const items = data.items || [];
  el.innerHTML = items.length ? items.slice(0, 6).map((file) => `<a class="row" href="${esc(file.link || '#')}" target="_blank" rel="noopener">
    <span class="row-main"><span class="row-title"><span class="t">${esc(file.name)}</span></span><span class="row-sub">${esc(file.account || '')}</span></span>
    <span class="row-side"><span class="row-time">${esc(file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '')}</span></span>
  </a>`).join('') : '<p class="empty">Geen recente bestanden gevonden.</p>';
  pill('drive').textContent = `${data.accounts?.length || 0} account${(data.accounts?.length || 0) === 1 ? '' : 's'}`;
  pill('drive').className = 'pill';
}

/* ---------------- opdrachten en geheugen ---------------- */

const shortDate = (stamp) => {
  if (!stamp) return '';
  return new Date(stamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
};

function missionText(job) {
  const result = job?.result || {};
  return String(result.text || result.summary || job.error || '').slice(0, 1100);
}

function renderAgent(data) {
  const jobs = data?.jobs || [];
  const active = data?.counts?.active || 0;
  $('#agentMode').textContent = data?.autopilot ? 'zelfstandig aan' : 'wacht op start';
  $('#agentMode').className = `pill ${data?.autopilot ? '' : 'muted'}`;
  $('#memoryCount').textContent = `${data?.counts?.memory || 0} feiten`;
  badge('missions').dataset.count = active;
  badge('missions').textContent = active;

  const list = $('#missionList');
  list.innerHTML = jobs.length ? jobs.slice(0, 8).map((job) => {
    const result = missionText(job);
    const sourceLinks = (job.result?.sources || []).filter((source) => source.url).slice(0, 3)
      .map((source) => `<a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.title || source.url)} ↗</a>`).join(' · ');
    const actions = job.status === 'queued'
      ? `<button type="button" class="mission-run" data-job="${esc(job.id)}">Start nu</button><button type="button" class="cancel mission-cancel" data-job="${esc(job.id)}">Annuleer</button>`
      : job.status === 'running'
        ? `<button type="button" class="cancel mission-cancel" data-job="${esc(job.id)}">Stoppen</button>`
        : result && voice.ready ? `<button type="button" class="mission-read" data-job="${esc(job.id)}">🔊 Lees voor</button>` : '';
    return `<article class="mission">
      <div class="mission-top"><span class="mission-title" title="${esc(job.instruction)}">${esc(job.title)}</span><span class="mission-status ${esc(job.status)}">${esc(job.status === 'running' ? 'bezig' : job.status === 'done' ? 'klaar' : job.status === 'failed' ? 'fout' : job.status === 'cancelled' ? 'gestopt' : 'wacht')}</span></div>
      <div class="mission-progress">${esc(job.progress || '')}${job.createdAt ? ` · ${shortDate(job.createdAt)}` : ''}</div>
      ${result ? `<div class="mission-result">${esc(result)}${sourceLinks ? `<br><br>${sourceLinks}` : ''}</div>` : ''}
      ${actions ? `<div class="mission-actions">${actions}</div>` : ''}
    </article>`;
  }).join('') : '<p class="empty">Nog geen opdrachten. Geef BOB er één en hij houdt je hier op de hoogte.</p>';

  const memories = data?.memory || [];
  const memoryList = $('#memoryList');
  memoryList.innerHTML = memories.length ? memories.map((item) => `<div class="memory-item">
    <span class="memory-dot"></span><span class="memory-text">${esc(item.content)}</span>
    <button type="button" class="memory-remove" data-memory="${esc(item.id)}" title="Vergeet dit" aria-label="Vergeet dit">×</button>
  </div>`).join('') : '<p class="empty">Nog niets apart onthouden.</p>';

  $$('.mission-run', list).forEach((button) => button.addEventListener('click', () => runMission(button.dataset.job)));
  $$('.mission-cancel', list).forEach((button) => button.addEventListener('click', () => cancelMission(button.dataset.job)));
  $$('.mission-read', list).forEach((button) => button.addEventListener('click', () => {
    const job = jobs.find((item) => item.id === button.dataset.job);
    if (job) voice.speak(missionText(job));
  }));
  $$('.memory-remove', memoryList).forEach((button) => button.addEventListener('click', () => forgetMemory(button.dataset.memory)));
}

async function loadAgent() {
  try {
    const res = await fetch('/api/agent/status');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Opdrachten niet beschikbaar');
    renderAgent(json);
    return json;
  } catch (err) {
    $('#agentMode').textContent = 'offline';
    $('#agentMode').className = 'pill muted';
    return null;
  }
}

async function submitMission(instruction, { announce = false } = {}) {
  const text = String(instruction || '').trim();
  if (!text) return;
  try {
    const res = await fetch('/api/agent/jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction: text }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Opdracht kon niet worden gestart');
    $('#missionInput').value = '';
    toast(`BOB pakt dit op: ${json.job.title}`, 'ok');
    if (announce) addMessage('bob', `Ik pak dit zelfstandig op. Je ziet mijn voortgang bij Opdrachten.`);
    await loadAgent();
  } catch (err) { toast(err.message, 'err'); }
}

async function runMission(id) {
  try {
    const res = await fetch(`/api/agent/jobs/${encodeURIComponent(id)}/run`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Starten mislukt');
    await loadAgent();
  } catch (err) { toast(err.message, 'err'); }
}

async function cancelMission(id) {
  try {
    const res = await fetch(`/api/agent/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Annuleren mislukt');
    await loadAgent();
  } catch (err) { toast(err.message, 'err'); }
}

async function forgetMemory(id) {
  try {
    const res = await fetch(`/api/agent/memory/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Vergeten mislukt');
    await loadAgent();
  } catch (err) { toast(err.message, 'err'); }
}

function isMissionInstruction(question) {
  return /^(?:\/do\s+|(?:kun je\s+)?(?:onderzoek|zoek|vind uit|lees|onthoud|bewaar)\b|(?:maak|voeg|zet|plan)\b.*\b(?:todoist|taak)\b)/i.test(String(question || '').trim());
}

/* ---------------- data ophalen ---------------- */

// De dag die de agendakaart nu toont. Los van "vandaag" op de pagina —
// je kunt vooruitbladeren terwijl de rest van het dashboard gewoon ververst.
let selectedDate = dateOnly(new Date());

function updateAgendaLabel() {
  const offset = daysBetween(selectedDate, new Date());
  const weekday = selectedDate.toLocaleDateString('nl-NL', { weekday: 'long' });
  const long = selectedDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const prefix = offset === 0 ? 'Vandaag · ' : offset === 1 ? 'Morgen · ' : offset === -1 ? 'Gisteren · ' : '';
  $('#agendaLabel').textContent = `${prefix}${cap} ${long}`;
  $('#agendaToday').classList.toggle('on', offset === 0);
  $('#agendaDate').value = toDateInput(selectedDate);
}

async function loadAgendaForSelectedDate() {
  const offset = daysBetween(selectedDate, new Date());
  try {
    const res = await fetch(`/api/agenda?offset=${offset}`);
    renderAgenda(await res.json());
  } catch {
    renderAgenda({ ok: false });
  }
}

function goToAgendaDate(date) {
  selectedDate = dateOnly(date);
  updateAgendaLabel();
  body('agenda').innerHTML = '<div class="skeleton"></div>';
  loadAgendaForSelectedDate();
}

async function loadAll() {
  const sync = $('#syncState');
  $('#refreshBtn').classList.add('spin');
  sync.textContent = 'verversen…'; sync.classList.remove('err');
  try {
    const res = await fetch('/api/all');
    const data = await res.json();
    $('#demoBanner').hidden = !data.demo;
    updateAgendaLabel();
    // /api/all levert altijd vandaag — dat hergebruiken we alleen als de
    // agendakaart ook op vandaag staat, anders halen we de gekozen dag apart op.
    if (daysBetween(selectedDate, new Date()) === 0) renderAgenda(data.agenda);
    else await loadAgendaForSelectedDate();
    renderMail(data.mail);
    renderTodoist(data.todoist);
    renderWhatsApp(data.whatsapp);
    renderSocial(data.social);
    renderDrive(data.drive);

    pill('brain').textContent = data.capabilities?.brain ? 'klaar' : 'geen API-key';
    pill('brain').className = 'pill' + (data.capabilities?.brain ? '' : ' muted');

    sync.textContent = `bijgewerkt ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (err) {
    sync.textContent = 'server onbereikbaar'; sync.classList.add('err');
    toast('Kan de BOB-server niet bereiken. Draait hij nog?', 'err');
  } finally {
    $('#refreshBtn').classList.remove('spin');
  }
}

/* ---------------- gesprek ---------------- */

const thread = $('#assistantThread');

function addMessage(role, text) {
  $('#assistantHello').hidden = true;
  thread.hidden = false;
  const el = document.createElement('div');
  el.className = `msg ${role === 'user' ? 'me' : 'bob'}`;
  el.textContent = text;
  if (role === 'bob' && voice.ready) {
    const btn = document.createElement('button');
    btn.className = 'replay';
    btn.innerHTML = '🔊 Lees voor';
    btn.onclick = () => voice.speak(text);
    el.append(document.createElement('br'), btn);
  }
  thread.append(el);
  thread.scrollTop = thread.scrollHeight;
  return el;
}

let busy = false;

async function askBob(question, { speakAnswer = false } = {}) {
  if (busy || !question.trim()) return;
  if (isMissionInstruction(question)) {
    addMessage('user', question);
    await submitMission(question, { announce: true });
    if (speakAnswer && voice.ready) await voice.speak('Ik pak dit op. Je ziet mijn voortgang bij opdrachten.');
    closeVoiceLayer();
    return;
  }
  busy = true;
  addMessage('user', question);
  const placeholder = addMessage('bob', 'BOB denkt na…');
  placeholder.classList.add('thinking');
  setVoiceState('thinking', 'BOB denkt na…');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Er ging iets mis');

    placeholder.remove();
    addMessage('bob', json.text);
    if (speakAnswer && voice.ready) {
      setVoiceState('speaking', json.text.slice(0, 220));
      await voice.speak(json.text);
    }
    closeVoiceLayer();
  } catch (err) {
    placeholder.remove();
    addMessage('bob', `Dat lukte niet: ${err.message}`);
    toast(err.message, 'err');
    closeVoiceLayer();
  } finally {
    busy = false;
  }
}

/* ---------------- spraak-UI ---------------- */

const layer = $('#voiceLayer');
const orb = $('#orb');
const caption = $('#voiceCaption');

function openVoiceLayer(text = 'Luisteren…') { layer.hidden = false; caption.textContent = text; }
function closeVoiceLayer() { layer.hidden = true; orb.className = 'orb'; }
function setVoiceState(state, text) {
  if (layer.hidden && state !== 'idle') return;
  orb.className = `orb ${state}`;
  if (text) caption.textContent = text;
}

let pushing = false;

async function startTalking() {
  if (pushing || busy) return;
  pushing = true;
  openVoiceLayer('Luisteren…');
  $('#fabMic').classList.add('live');
  $('#micButton').classList.add('live');
  await voice.startRecording();
}

async function stopTalking() {
  if (!pushing) return;
  pushing = false;
  $('#fabMic').classList.remove('live');
  $('#micButton').classList.remove('live');
  setVoiceState('thinking', 'Uitwerken…');
  const text = await voice.stopRecording();
  if (!text) { closeVoiceLayer(); return; }
  caption.textContent = `“${text}”`;
  await askBob(text, { speakAnswer: true });
}

/* ---------------- opstarten ---------------- */

function paintDate() {
  $('#pageDate').textContent = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^./, (c) => c.toUpperCase());
}

function wireUi() {
  $('#missionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitMission($('#missionInput').value);
  });

  $('#omnibox').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#omniboxInput');
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    askBob(q);
    $('#card-assistent').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $$('.quick').forEach((btn) => btn.addEventListener('click', () => askBob(btn.dataset.prompt)));

  $('#refreshBtn').addEventListener('click', async () => {
    await fetch('/api/refresh', { method: 'POST' });
    loadAll();
  });

  $('#briefingBtn').addEventListener('click', async () => {
    if (!voice.ready) { toast('Stem niet ingesteld — vul CARTESIA_API_KEY en CARTESIA_VOICE_ID in .env', 'err'); return; }
    openVoiceLayer('Je briefing…');
    setVoiceState('speaking');
    await voice.playBriefing();
    closeVoiceLayer();
  });

  $('#collapseBtn').addEventListener('click', () => document.body.classList.toggle('collapsed'));

  $('#agendaPrev').addEventListener('click', () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() - 1); goToAgendaDate(d);
  });
  $('#agendaNext').addEventListener('click', () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + 1); goToAgendaDate(d);
  });
  $('#agendaToday').addEventListener('click', () => goToAgendaDate(new Date()));
  $('#agendaDate').addEventListener('change', (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    goToAgendaDate(new Date(y, m - 1, d));
  });

  $('#customizeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('bob-theme', dark ? 'light' : 'dark'); } catch { /* privémodus */ }
  });

  $('#settingsBtn').addEventListener('click', () => {
    const on = voice.wakeEnabled;
    if (on) { voice.disableWakeWord(); toast('Wakewoord uit'); }
    else if (voice.enableWakeWord(() => startTalking())) toast('Wakewoord aan — zeg “Hey BOB”', 'ok');
  });

  $('#showActivity').addEventListener('click', async (e) => {
    e.preventDefault();
    const data = await loadAgent();
    const latest = (data?.activity || []).slice(0, 3).map((item) => item.message).join(' · ');
    toast(latest || 'Nog geen acties uitgevoerd.');
  });

  const micDown = (e) => { e.preventDefault(); startTalking(); };
  const micUp = (e) => { e.preventDefault(); stopTalking(); };
  for (const el of [$('#fabMic'), $('#micButton')]) {
    el.addEventListener('mousedown', micDown);
    el.addEventListener('touchstart', micDown, { passive: false });
    el.addEventListener('mouseup', micUp);
    el.addEventListener('mouseleave', () => { if (pushing) stopTalking(); });
    el.addEventListener('touchend', micUp);
  }

  document.addEventListener('keydown', (e) => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#omniboxInput').focus(); return; }
    if (e.key === 'Escape') { voice.stopSpeaking(); closeVoiceLayer(); pushing = false; return; }
    if (e.code === 'Space' && !typing && !e.repeat) { e.preventDefault(); startTalking(); }
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && pushing) { e.preventDefault(); stopTalking(); }
  });

  voice.on('error', (msg) => toast(msg, 'err'));
  voice.on('speaking', (on) => { if (on) setVoiceState('speaking'); });
  voice.on('recording', (on) => { if (on) setVoiceState('', 'Luisteren…'); });
}

(async function boot() {
  try {
    const saved = localStorage.getItem('bob-theme');
    if (saved) document.documentElement.dataset.theme = saved;
  } catch { /* privémodus */ }

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  $('.omnibox-kbd').textContent = isMac ? '⌘K' : 'Ctrl+K';

  paintDate();
  updateAgendaLabel();
  wireUi();
  await voice.init();
  if (!voice.ready) $('#fabMic').title = 'Stem niet ingesteld (zie .env)';
  await loadAll();
  await loadAgent();
  setInterval(loadAll, 180_000);
  setInterval(loadAgent, 10_000);
  console.log(`BOB draait. Tijdzone: ${TZ}`);
})();
