'use client';

import React from 'react';
import { Ico, SchermKop, SchermVoet, KaartKop, NietGekoppeld, Skelet } from '@/components/ui';
import { useApi } from '@/components/hooks';
import { useBob } from '@/components/Shell';
import { hhmm, initialen } from '@/lib/client';

export default function GoogleScherm() {
  const mail = useApi<any>('/api/mail');
  const agenda = useApi<any>('/api/agenda?offset=0');
  const { vraag, bezig } = useBob();

  const g = mail.data?.gmail;
  const events = (agenda.data?.events ?? []).filter((e: any) => e.source === 'google');

  return (
    <>
      <SchermKop
        kleur="#4285f4" icoon={<Ico.google />} titel="Google Workspace" onder="Alles verbonden. Slimmer werken met Bob."
        citaat="„Jouw Google Workspace, slimmer, sneller, productiever.”"
        acties={<button className="btn-ghost" onClick={() => { mail.opnieuw(); agenda.opnieuw(); }}><Ico.ververs />Verversen</button>}
      />

      <div className="cols cols-google">
        <div className="card">
          <KaartKop kleur="#ea4335" icoon={<Ico.mail />} titel="Gmail" onder="Ongelezen berichten"
            rechts={<span className={`pill${g?.ok ? '' : ' muted'}`}>{g?.ok ? `${g.unread} ongelezen` : 'niet gekoppeld'}</span>} />
          <div className="list">
            {mail.bezig ? <Skelet />
              : !g?.ok ? <NietGekoppeld titel="Gmail niet gekoppeld" uitleg="Koppel je Google-account in de instellingen." knop={{ tekst: 'Naar instellingen', href: '/instellingen' }} />
              : (g.messages ?? []).length ? g.messages.map((m: any) => (
                <a className="item ongelezen" key={m.id} href={m.link} target="_blank" rel="noopener">
                  <span className="item-av" style={{ ['--c' as string]: '#ea4335' } as React.CSSProperties}>{initialen(m.from)}</span>
                  <span className="item-main">
                    <span className="item-top"><span className="item-naam">{m.from}</span><span className="item-tijd">{hhmm(m.date)}</span></span>
                    <span className="item-sub">{m.subject}</span>
                  </span>
                </a>
              )) : <p className="empty">Geen ongelezen berichten.</p>}
          </div>
          <footer className="card-foot"><a href="/api/google/open?service=gmail" target="_blank" rel="noopener">Alle e-mails bekijken <span className="arrow">↗</span></a></footer>
        </div>

        <div className="card">
          <KaartKop kleur="#1a73e8" icoon={<Ico.agenda />} titel="Agenda" onder="Vandaag" />
          <div className="card-body">
            {agenda.bezig ? <Skelet />
              : !agenda.data?.ok ? <NietGekoppeld titel="Agenda niet gekoppeld" uitleg="Koppel Google in de instellingen." knop={{ tekst: 'Naar instellingen', href: '/instellingen' }} />
              : events.length ? events.slice(0, 8).map((e: any) => (
                <div className="slot" key={e.id} style={{ ['--c' as string]: e.color || '#1a73e8' } as React.CSSProperties}>
                  <span className="slot-time">{e.allDay ? '—' : hhmm(e.start)}</span>
                  <span className="slot-rail"><span className="slot-dot" /></span>
                  <span><div className="slot-title">{e.title}</div><div className="slot-sub">{e.calendar}</div></span>
                </div>
              )) : <p className="empty">Geen Google-afspraken vandaag.</p>}
          </div>
          <footer className="card-foot"><a href="/api/google/open?service=calendar" target="_blank" rel="noopener">Volledige agenda <span className="arrow">↗</span></a></footer>
        </div>

        <div className="card">
          <KaartKop kleur="#00ac47" icoon={<Ico.drive />} titel="Drive" onder="Bestanden" />
          <div className="card-body">
            <NietGekoppeld titel="Geen leesrechten op Drive"
              uitleg="BOB vraagt alleen toegang tot je agenda en mail. Drive-bestanden tonen zou een extra machtiging vragen die hij nu bewust niet heeft." />
          </div>
          <footer className="card-foot"><a href="https://drive.google.com" target="_blank" rel="noopener">Drive openen <span className="arrow">↗</span></a></footer>
        </div>

        <div className="card">
          <KaartKop kleur="#f9ab00" icoon={<Ico.fotos />} titel="Foto’s" onder="Recent" />
          <div className="card-body">
            <NietGekoppeld titel="Geen leesrechten op Foto’s"
              uitleg="Zelfde reden als Drive: minder machtigingen is minder risico. Je opent ze hier met één klik." />
          </div>
          <footer className="card-foot"><a href="https://photos.google.com" target="_blank" rel="noopener">Foto’s openen <span className="arrow">↗</span></a></footer>
        </div>
      </div>

      <div className="commandbar">
        {[
          ['Vat Gmail samen', 'Vat mijn ongelezen Gmail samen in korte punten.'],
          ['Toon agenda', 'Wat staat er vandaag in mijn agenda?'],
          ['Vind focusblok', 'Waar zitten vandaag gaten in mijn agenda waarin ik geconcentreerd kan werken?'],
          ['Wat vraagt actie', 'Welke Google-mails vragen om een antwoord vandaag?'],
        ].map(([label, prompt]) => (
          <button key={label} className="command-chip" onClick={() => vraag(prompt)} disabled={bezig}>{label}</button>
        ))}
      </div>

      <SchermVoet />
    </>
  );
}
