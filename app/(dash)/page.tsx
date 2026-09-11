'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Ico, KaartKop, NietGekoppeld, Skelet } from '@/components/ui';
import { NetwerkHoofd } from '@/components/NetwerkHoofd';
import { useApi } from '@/components/hooks';
import { useBob, } from '@/components/Shell';
import { stapTekst } from '@/components/BobRail';
import { hhmm, dagenTussen, naarDatumVeld, alleenDatum } from '@/lib/client';
import { haal } from '@/lib/client';
import { FoundationOverview } from '@/components/FoundationOverview';

/* ============================================================
   Het hoofdscherm: panelen links en rechts, het netwerkhoofd in
   het midden.
   ============================================================ */

const SNELACTIES = [
  { ico: '📋', titel: 'Briefing', onder: 'Mijn dag in het kort', prompt: 'Geef me een korte briefing van mijn dag.' },
  { ico: '🎯', titel: 'Prioriteit', onder: 'Wat eerst?', prompt: 'Wat is vandaag het belangrijkste dat ik moet doen, en waarom?' },
  { ico: '✉️', titel: 'Mail triage', onder: 'Wat vraagt actie', prompt: 'Welke mails vragen echt om een antwoord vandaag? Vat ze samen.' },
  { ico: '🧠', titel: 'Focusblok', onder: 'Vind vrije tijd', prompt: 'Waar zitten vandaag de gaten in mijn agenda waarin ik geconcentreerd kan werken?' },
  { ico: '🌐', titel: 'Op het web', onder: 'Zoeken en samenvatten', prompt: 'Zoek op het web wat er vandaag speelt in mijn vakgebied en vat het in vijf zinnen samen. Noem de bronnen.' },
];

export default function Vandaag() {
  const [datum, setDatum] = useState(() => alleenDatum(new Date()));
  const offset = dagenTussen(datum, new Date());

  const mail = useApi<any>('/api/mail');
  const taken = useApi<any>('/api/todoist');
  const social = useApi<any>('/api/social');
  const wa = useApi<any>('/api/whatsapp');
  const agenda = useApi<any>(`/api/agenda?offset=${offset}`);

  const { vraag, gesprek, bezig } = useBob();

  const weekdag = datum.toLocaleDateString('nl-NL', { weekday: 'long' });
  const langeDatum = datum.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
  const voorvoegsel = offset === 0 ? 'Vandaag · ' : offset === 1 ? 'Morgen · ' : offset === -1 ? 'Gisteren · ' : '';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vandaag</h1>
          <p className="page-date">
            {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              .replace(/^./, (c) => c.toUpperCase())}
          </p>
        </div>
      </div>

      <FoundationOverview />

      <div className="stage">
        {/* ---------- links ---------- */}
        <div className="zone zone-left">
          <section className="card">
            <KaartKop kleur="#0d5138" icoon={<Ico.chat />} titel="Communicatie" onder="Altijd in contact" />
            <div className="card-body">
              <div className="app-grid app-grid-3">
                <Tegel naam="WhatsApp" kleur="#25d366" href="/whatsapp" intern
                  aantal={wa.data?.ok ? wa.data.unread : 0} gekoppeld={Boolean(wa.data?.ok)} ico={<Ico.wa />} />
                <Tegel naam="Outlook" kleur="#0f6cbd" href="/outlook" intern
                  aantal={mail.data?.outlook?.unread || 0} gekoppeld={Boolean(mail.data?.outlook?.ok)} ico={<Ico.outlook />} />
                <Tegel naam="Gmail" kleur="#ea4335" href="/mail" intern
                  aantal={mail.data?.gmail?.unread || 0} gekoppeld={Boolean(mail.data?.gmail?.ok)} ico={<Ico.mail />} />
              </div>
              {wa.data?.ok && wa.data.chats?.length > 0 && (
                <div className="wa-chats">
                  {wa.data.chats.map((c: any) => (
                    <div className="wa-row" key={c.naam}>
                      <span className={`wa-dot${c.groep ? ' groep' : ''}`} />
                      <span className="wa-naam">{c.naam}</span>
                      <span className="count">{c.aantal}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <KaartKop kleur="#ea4335" icoon={<Ico.agenda />} titel="Planning" onder="Je dag in beeld" />
            <div className="agenda-toolbar" role="group" aria-label="Datum kiezen">
              <button className="date-nav-btn" aria-label="Vorige dag"
                onClick={() => setDatum((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <span className="agenda-label">{voorvoegsel}{weekdag.charAt(0).toUpperCase() + weekdag.slice(1)} {langeDatum}</span>
              {offset !== 0 && <button className="date-nav-today" onClick={() => setDatum(alleenDatum(new Date()))}>Vandaag</button>}
              <input type="date" className="date-input" aria-label="Kies datum"
                value={naarDatumVeld(datum)}
                onChange={(e) => { const [y, m, d] = e.target.value.split('-').map(Number); if (y) setDatum(new Date(y, m - 1, d)); }} />
              <button className="date-nav-btn" aria-label="Volgende dag"
                onClick={() => setDatum((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
            <div className="card-body">
              {agenda.bezig ? <Skelet /> : <Agenda data={agenda.data} offset={offset} />}
            </div>
            <footer className="card-foot">
              <a href="/api/google/open?service=calendar" target="_blank" rel="noopener">Volledige agenda bekijken <span className="arrow">↗</span></a>
            </footer>
          </section>

          <section className="card">
            <KaartKop kleur="#e44332" icoon={<Ico.taken />} titel="Todoist" onder="Meer gedaan, minder gedoe"
              rechts={<span className={`pill${taken.data?.ok ? '' : ' muted'}`}>{taken.data?.ok ? `${taken.data.open} taken open` : 'uit'}</span>} />
            <div className="card-body">
              {taken.bezig ? <Skelet /> : <Taken data={taken.data} opnieuw={taken.opnieuw} />}
            </div>
            <footer className="card-foot">
              <a href="https://app.todoist.com" target="_blank" rel="noopener">Open Todoist <span className="arrow">↗</span></a>
            </footer>
          </section>
        </div>

        {/* ---------- midden ---------- */}
        <section className="hero" aria-label="BOB">
          <div className="hero-canvas">
            <NetwerkHoofd />
            <span className="hero-halo" aria-hidden="true" />
          </div>
          <div className="hero-pedestal" aria-hidden="true">
            <span className="ped ped-1" /><span className="ped ped-2" /><span className="ped ped-3" />
          </div>
          <div className="hero-copy">
            <h2>Bob</h2>
            <p>Jouw slimme assistent<br />voor een productiever leven</p>
          </div>
          <span className="hero-tag t-analyseren">Analyseren</span>
          <span className="hero-tag t-begrijpen">Begrijpen</span>
          <span className="hero-tag t-vooruit">Vooruitdenken</span>
          <span className="hero-tag t-verbinden">Verbinden</span>
          <span className="hero-tag t-creeren">Creëren</span>
        </section>

        <div className="zone zone-center">
          <section className="card card-assistant" id="card-assistent">
            <KaartKop kleur="#f59e0b" icoon={<Ico.vonk />} titel="BOB Assistent" onder="Vraag maar raak"
              rechts={<span className="pill">{bezig ? 'bezig' : 'stel een vraag'}</span>} />
            <div className="card-body">
              {gesprek.length === 0 ? (
                <div className="assistant-hello">
                  <span className="spark">✦</span>
                  <div>
                    <strong>Hallo, ik ben BOB.</strong>
                    <p>Vraag me naar je agenda, je mail of je taken. Of laat me iets opzoeken op het web.</p>
                  </div>
                </div>
              ) : (
                <div className="assistant-thread">
                  {gesprek.map((m, i) => (
                    <div key={i} className={`msg ${m.rol}`}>
                      {m.tekst}
                      {m.stappen?.length ? <div className="msg-steps">{m.stappen.map(stapTekst).join(' · ')}</div> : null}
                    </div>
                  ))}
                  {bezig && <div className="msg bob thinking">BOB denkt na…</div>}
                </div>
              )}
              <div className="quick-actions">
                {SNELACTIES.map((a) => (
                  <button key={a.titel} className="quick" onClick={() => vraag(a.prompt)} disabled={bezig}>
                    <span className="q-ico">{a.ico}</span>
                    <span><b>{a.titel}</b><small>{a.onder}</small></span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <KaartKop kleur="#8b5cf6" icoon={<Ico.social />} titel="Social Media" onder="Blijf verbonden" />
            <div className="card-body">
              <div className="app-grid">
                {(social.data?.items ?? []).map((p: any) => (
                  <Link key={p.id} className="app-tile" href="/social" style={{ ['--c' as string]: KLEUR[p.id] } as React.CSSProperties}>
                    <span className="app-glyph">{MERK[p.id]}</span>
                    <span className="app-num">{p.ok ? p.value : '—'}</span>
                    <span className="app-name">{p.label}</span>
                  </Link>
                ))}
                {!social.data && <Skelet />}
              </div>
            </div>
          </section>
        </div>

        {/* ---------- rechts ---------- */}
        <div className="zone zone-right">
          <section className="card">
            <KaartKop kleur="#4285f4" icoon={<Ico.google />} titel="Google Workspace" onder="Alles van Google op één plek"
              rechts={<span className={`pill${mail.data?.gmail?.ok ? '' : ' muted'}`}>{mail.data?.gmail?.ok ? `${mail.data.gmail.unread} ongelezen` : 'niet gekoppeld'}</span>} />
            <div className="card-body">
              <div className="app-grid">
                <Tegel naam="Gmail" kleur="#ea4335" href="/api/google/open?service=gmail" ico={<Ico.mail />} aantal={mail.data?.gmail?.unread || 0} gekoppeld={Boolean(mail.data?.gmail?.ok)} />
                <Tegel naam="Agenda" kleur="#1a73e8" href="/api/google/open?service=calendar" ico={<Ico.agenda />} snelkoppeling />
                <Tegel naam="Drive" kleur="#00ac47" href="https://drive.google.com" ico={<Ico.drive />} snelkoppeling />
                <Tegel naam="Foto's" kleur="#f9ab00" href="https://photos.google.com" ico={<Ico.fotos />} snelkoppeling />
              </div>
            </div>
          </section>

          <section className="card">
            <KaartKop kleur="#0f6cbd" icoon={<Ico.outlook />} titel="Outlook" onder="Wat vraagt een antwoord"
              rechts={<span className={`pill${mail.data?.outlook?.ok ? '' : ' muted'}`}>{mail.data?.outlook?.ok ? `${mail.data.outlook.unread} ongelezen` : 'niet gekoppeld'}</span>} />
            <div className="card-body">
              {mail.bezig ? <Skelet /> : mail.data?.outlook?.ok ? (
                (mail.data.outlook.messages || []).slice(0, 4).map((m: any) => (
                  <a className="row" key={m.id} href={m.link} target="_blank" rel="noopener">
                    <span className="row-main">
                      <span className="row-title"><span className="t">{m.from}</span></span>
                      <span className="row-sub">{m.subject}</span>
                    </span>
                    <span className="row-side"><span className="row-time">{hhmm(m.date)}</span></span>
                  </a>
                ))
              ) : <NietGekoppeld titel="Outlook nog niet gekoppeld" uitleg="Koppel je Microsoft-account voor mail en agenda." knop={{ tekst: 'Nu koppelen', href: '/instellingen' }} />}
            </div>
            <footer className="card-foot"><Link href="/outlook">Alles in Outlook <span className="arrow">↗</span></Link></footer>
          </section>

          <section className="card">
            <KaartKop kleur="#1a9464" icoon={<Ico.vonk />} titel="Web Assistent" onder="Slimmer surfen, sneller resultaat" />
            <div className="card-body">
              <div className="app-grid app-grid-5">
                <Link className="app-tile" href="/web" style={{ ['--c' as string]: '#1a73e8' } as React.CSSProperties}>
                  <span className="app-glyph"><Ico.web /></span><span className="app-name">Browser</span>
                </Link>
                {[
                  { n: 'Samenvatten', c: '#0f766e', i: <Ico.document />, p: 'Vat de pagina samen die ik nu open heb staan. Als er nog niets open staat, vraag me om een link.' },
                  { n: 'Schrijven', c: '#7c3aed', i: <Ico.pen />, p: 'Help me een tekst schrijven. Vraag eerst waarvoor, voor wie en hoe lang.' },
                  { n: 'Onderzoeken', c: '#0284c7', i: <Ico.zoek />, p: 'Zoek op het web voor me. Vraag eerst waarover, en geef daarna een kort antwoord met bronnen.' },
                  { n: 'Vertalen', c: '#d97706', i: <Ico.vertaal />, p: 'Vertaal een tekst voor me. Vraag eerst welke tekst en naar welke taal.' },
                ].map((t) => (
                  <button key={t.n} className="app-tile" style={{ ['--c' as string]: t.c } as React.CSSProperties} onClick={() => vraag(t.p)} disabled={bezig}>
                    <span className="app-glyph">{t.i}</span><span className="app-name">{t.n}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="stage-foot">
        <blockquote className="ethos">„Eén assistent.<br />Al jouw tools.<br />Een productievere jij.”</blockquote>
        <p className="stamp">MENS &nbsp;+&nbsp; AI &nbsp;=&nbsp; MEER MOGELIJK <span className="stamp-rule" /></p>
        <div className="ethos-right">
          <blockquote className="ethos">Slimmer<br />Verbonden<br />Productiever<br />Met Bob.</blockquote>
          <p className="signature">Good ideas<br />go further</p>
        </div>
      </div>
    </>
  );
}

/* ---------------- onderdelen ---------------- */

const KLEUR: Record<string, string> = { linkedin: '#0a66c2', instagram: '#e1306c', facebook: '#1877f2', tiktok: '#111827' };
const MERK: Record<string, React.ReactNode> = {
  linkedin: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3.5" y="9.5" width="3.4" height="11" rx=".6" /><circle cx="5.2" cy="5.4" r="2" /><path d="M10.4 9.5h3.2v1.6a3.6 3.6 0 0 1 3.2-1.8c2.6 0 3.7 1.7 3.7 4.3v6.9h-3.4v-6.2c0-1.4-.5-2.1-1.6-2.1-1.2 0-1.8.8-1.8 2.2v6.1h-3.3z" /></svg>,
  instagram: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="16.9" cy="7.1" r="1.1" fill="currentColor" stroke="none" /></svg>,
  facebook: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.9 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1A22 22 0 0 0 14.7 3c-2.5 0-4.2 1.5-4.2 4.3v2.3H7.7v3.2h2.8V21z" /></svg>,
  tiktok: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M9.5 12.8a3.4 3.4 0 1 0 3.4 3.4V4.2" /><path d="M12.9 6.6a4.6 4.6 0 0 0 4.4 3.3" /></svg>,
};

function Tegel({ naam, kleur, href, ico, aantal, gekoppeld, intern, snelkoppeling }: {
  naam: string; kleur: string; href: string; ico: React.ReactNode; aantal?: number; gekoppeld?: boolean; intern?: boolean; snelkoppeling?: boolean;
}) {
  const inhoud = (
    <>
      {aantal ? <span className="app-badge">{aantal}</span> : null}
      <span className="app-glyph">{ico}</span>
      <span className="app-name">{naam}</span>
      <span className="app-note">{snelkoppeling ? 'Openen ↗' : gekoppeld ? `${aantal ?? 0} nieuw` : 'niet gekoppeld'}</span>
    </>
  );
  const stijl = { ['--c' as string]: kleur } as React.CSSProperties;
  return intern
    ? <Link className="app-tile" href={href} style={stijl}>{inhoud}</Link>
    : <a className="app-tile" href={href} target="_blank" rel="noopener" style={stijl}>{inhoud}</a>;
}

function Agenda({ data, offset }: { data: any; offset: number }) {
  if (!data?.ok) {
    return <NietGekoppeld titel="Agenda nog niet gekoppeld"
      uitleg="Koppel Google en/of Outlook om je afspraken hier te zien."
      knop={{ tekst: 'Nu koppelen', href: '/instellingen' }} />;
  }
  const events = data.events || [];
  if (!events.length) {
    return <p className="empty">{offset === 0 ? 'Geen afspraken. Lekker.' : 'Geen afspraken op deze dag.'}</p>;
  }
  const nu = Date.now();
  return (
    <>
      {events.slice(0, 8).map((ev: any) => {
        const start = ev.start ? +new Date(ev.start) : 0;
        const eind = ev.end ? +new Date(ev.end) : 0;
        const bezig = start && eind && nu >= start && nu <= eind;
        const mins = start && eind ? Math.round((eind - start) / 60000) : 0;
        const duur = ev.allDay ? 'hele dag' : mins >= 60 ? `${Math.floor(mins / 60)}u${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`;
        return (
          <div className={`slot${bezig ? ' now' : ''}`} key={ev.id} style={{ ['--c' as string]: ev.color || '#3b82f6' } as React.CSSProperties}>
            <span className="slot-time">{ev.allDay ? '—' : hhmm(ev.start)}</span>
            <span className="slot-rail"><span className="slot-dot" /></span>
            <span>
              <div className="slot-title">{ev.title}</div>
              <div className="slot-sub">{duur}{ev.location ? ` · ${ev.location}` : ''} · {ev.calendar}</div>
            </span>
          </div>
        );
      })}
    </>
  );
}

function Taken({ data, opnieuw }: { data: any; opnieuw: () => void }) {
  const { toast } = useBob();
  if (!data?.ok) {
    const kapot = data?.reason === 'error';
    return <NietGekoppeld titel={kapot ? 'Todoist geeft een foutmelding' : 'Todoist nog niet gekoppeld'}
      uitleg={data?.error || data?.hint || 'Zet TODOIST_API_TOKEN in je omgevingsvariabelen.'} />;
  }
  const g = data.groups || {};
  const groepen: [string, string, boolean][] = [
    ['overdue', 'Over tijd', true], ['today', 'Vandaag', false], ['tomorrow', 'Morgen', false],
    ['later', 'Later', false], ['someday', 'Zonder datum', false],
  ];
  const iets = groepen.some(([k]) => g[k]?.length);
  if (!iets) return <p className="empty">Niets openstaand. Goed bezig.</p>;

  async function vink(id: string) {
    try { await haal(`/api/todoist/${id}/complete`, { method: 'POST' }); toast('Taak afgevinkt', 'ok'); opnieuw(); }
    catch (e) { toast(`Afvinken mislukt: ${(e as Error).message}`, 'err'); }
  }

  return (
    <>
      {groepen.map(([sleutel, label, laat]) => {
        const items = g[sleutel] || [];
        if (!items.length) return null;
        const totaal = data.counts?.[sleutel] ?? items.length;
        const meer = totaal - items.length;
        return (
          <div className="task-group" key={sleutel}>
            <h3>{label} <em>{totaal}</em></h3>
            {items.map((t: any) => (
              <div className="task" key={t.id}>
                <input type="checkbox" aria-label="Afvinken" onChange={() => vink(t.id)} />
                <label>{t.content}</label>
                {t.dueString && <span className={`task-due${laat ? ' late' : ''}`}>{t.dueString}</span>}
              </div>
            ))}
            {meer > 0 && <a className="task-more" href="https://app.todoist.com" target="_blank" rel="noopener">+{meer} meer in Todoist ↗</a>}
          </div>
        );
      })}
    </>
  );
}
