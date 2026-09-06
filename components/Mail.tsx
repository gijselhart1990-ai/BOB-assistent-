'use client';

import React from 'react';
import { hhmm, initialen } from '@/lib/client';
import { useBob } from '@/components/Shell';

export type Bericht = {
  id: string; from: string; subject: string; date?: string | null; link?: string;
  bron: 'gmail' | 'outlook';
};

const KLEUR = { gmail: '#ea4335', outlook: '#0f6cbd' } as const;

export function MailLijst({ berichten, gekozen, kies }: {
  berichten: Bericht[]; gekozen: number; kies: (i: number) => void;
}) {
  if (!berichten.length) return <p className="empty">Geen berichten.</p>;
  return (
    <>
      {berichten.map((m, i) => (
        <button key={m.id} className={`item ongelezen${i === gekozen ? ' on' : ''}`} onClick={() => kies(i)}>
          <span className="item-av" style={{ ['--c' as string]: KLEUR[m.bron] } as React.CSSProperties}>{initialen(m.from)}</span>
          <span className="item-main">
            <span className="item-top">
              <span className="item-naam">{m.from}</span>
              <span className="item-tijd">{hhmm(m.date)}</span>
            </span>
            <span className="item-sub">{m.subject}</span>
          </span>
        </button>
      ))}
    </>
  );
}

export function MailLezen({ bericht }: { bericht?: Bericht }) {
  const { vraag, bezig } = useBob();
  if (!bericht) return <p className="empty">Kies een bericht links.</p>;
  return (
    <>
      <div className="read-head">
        <span className="item-av" style={{ ['--c' as string]: KLEUR[bericht.bron] } as React.CSSProperties}>{initialen(bericht.from)}</span>
        <span className="read-van"><b>{bericht.from}</b><small>{bericht.bron === 'outlook' ? 'Outlook' : 'Gmail'}</small></span>
        <span className="read-meta">
          {bericht.date ? new Date(bericht.date).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
        </span>
      </div>
      <h2>{bericht.subject}</h2>
      <div className="read-body">
        BOB haalt alleen afzender, onderwerp en tijd op — de inhoud van je berichten blijft bij je mailprovider.
        Dat scheelt leesrechten die hij niet nodig heeft, en het houdt je post uit de database. Open het bericht
        hieronder om het te lezen.
      </div>
      <div className="read-actions">
        <a className="btn-primary" href={bericht.link || '#'} target="_blank" rel="noopener">Open bericht</a>
        <button className="btn-ghost" disabled={bezig}
          onClick={() => vraag(`Help me een antwoord schrijven op het bericht van ${bericht.from} met als onderwerp: ${bericht.subject}. Vraag eerst welke toon en wat de kern moet zijn.`)}>
          Laat Bob antwoorden
        </button>
        <button className="btn-ghost" disabled={bezig}
          onClick={() => vraag(`Wat is waarschijnlijk de vraag achter een mail van ${bericht.from} met onderwerp "${bericht.subject}", en hoe pak ik hem het slimst aan?`)}>
          Wat moet ik hiermee
        </button>
      </div>
    </>
  );
}
