'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Ico, SchermKop, SchermVoet, NietGekoppeld, Skelet } from '@/components/ui';
import { BobRail } from '@/components/BobRail';
import { useApi } from '@/components/hooks';
import { useBob } from '@/components/Shell';
import { hhmm, initialen } from '@/lib/client';

export default function WhatsappScherm() {
  const { data, bezig, opnieuw } = useApi<any>('/api/whatsapp');
  const [gekozen, setGekozen] = useState(0);
  const { vraag, bezig: denkt } = useBob();

  const chats = data?.ok ? (data.chats ?? []) : [];
  const chat = chats[gekozen];

  return (
    <>
      <SchermKop
        kleur="#25d366" icoon={<Ico.wa />} titel="WhatsApp" onder="Slimmer communiceren, met Bob aan je zijde."
        citaat="„Minder chatten. Meer gedaan krijgen.”"
        acties={<>
          <button className="btn-ghost" onClick={opnieuw}><Ico.ververs />Verversen</button>
          <a className="btn-primary" href="https://web.whatsapp.com" target="_blank" rel="noopener">Open WhatsApp Web</a>
        </>}
      />

      <div className="cols cols-wa">
        <div className="card list-card">
          <div className="list-head">
            <b>Chats</b>
            <span className={`pill${data?.ok ? '' : ' muted'}`}>{data?.ok ? `${data.unread} ongelezen` : 'uit'}</span>
          </div>
          <div className="list">
            {bezig ? <Skelet />
              : !data?.ok ? (
                <NietGekoppeld
                  titel={data?.reason === 'laptop offline' ? 'Je laptop is offline' : 'WhatsApp nog niet gekoppeld'}
                  uitleg={data?.hint || data?.error || 'Koppel eenmalig via het koppelscherm.'}
                  knop={{ tekst: 'Naar koppelen', href: '/koppelen' }} />
              ) : chats.length ? chats.map((c: any, i: number) => (
                <button key={c.naam} className={`item ongelezen${i === gekozen ? ' on' : ''}`} onClick={() => setGekozen(i)}>
                  <span className={`item-av${c.groep ? ' groep' : ''}`} style={{ ['--c' as string]: '#25d366' } as React.CSSProperties}>{initialen(c.naam)}</span>
                  <span className="item-main">
                    <span className="item-top"><span className="item-naam">{c.naam}</span><span className="item-tijd">{hhmm(c.tijd)}</span></span>
                    <span className="item-sub">{c.groep ? 'Groep' : 'Chat'} · {c.aantal} ongelezen</span>
                  </span>
                  <span className="count">{c.aantal}</span>
                </button>
              )) : <p className="empty">Geen ongelezen chats.</p>}
          </div>
        </div>

        <div className="card read-card">
          {!chat ? <p className="empty">Kies een chat links.</p> : (
            <>
              <div className="read-head">
                <span className={`item-av${chat.groep ? ' groep' : ''}`} style={{ ['--c' as string]: '#25d366' } as React.CSSProperties}>{initialen(chat.naam)}</span>
                <span className="read-van"><b>{chat.naam}</b><small>{chat.groep ? 'Groep' : 'Chat'} · {chat.aantal} ongelezen</small></span>
              </div>
              <div className="read-body">
                {`BOB leest mee, maar haalt geen berichtteksten op. Hij weet dat hier ${chat.aantal} ${chat.aantal === 1 ? 'bericht' : 'berichten'} ${chat.aantal === 1 ? 'wacht' : 'wachten'} — de inhoud blijft op je telefoon en in WhatsApp Web.

Dat is geen beperking die ik ben vergeten weg te halen: berichten van anderen horen niet ongevraagd in een dashboard, in een database of in een prompt terecht te komen.`}
              </div>
              <div className="read-actions">
                <a className="btn-primary" href="https://web.whatsapp.com" target="_blank" rel="noopener">Open in WhatsApp Web</a>
                <button className="btn-ghost" disabled={denkt}
                  onClick={() => vraag(`Ik moet ${chat.naam} nog antwoorden in WhatsApp. Help me een kort, vriendelijk bericht opstellen. Vraag eerst waar het over gaat.`)}>
                  Laat Bob meedenken
                </button>
              </div>
            </>
          )}
        </div>

        <BobRail
          intro="Actief met WhatsApp"
          opdracht={{ titel: 'check WhatsApp', onder: 'Ik houd bij wie er wacht.', prompt: 'Wie wacht er in WhatsApp op antwoord, en hoe dringend is het?' }}
          kaarten={[
            { ico: <Ico.document />, titel: 'Vat ongelezen samen', onder: 'Wie wacht waarop', prompt: 'Vat samen wie er in WhatsApp op antwoord wacht en waarover, op volgorde van urgentie.' },
            { ico: <Ico.vonk />, titel: 'Stel antwoord voor', onder: 'Bob schrijft een concept', prompt: 'Schrijf een kort, vriendelijk antwoord dat ik zelf kan versturen. Vraag eerst aan wie en waarover.' },
            { ico: <Ico.agenda />, titel: 'Plan afspraak', onder: 'Zet het in je agenda', prompt: 'Volgt er een afspraak uit mijn WhatsApp-berichten? Stel een moment voor uit mijn vrije agenda.' },
            { ico: <Ico.zoek />, titel: 'Zoek bericht', onder: 'Bob zoekt mee', prompt: 'Help me een bericht terugvinden. Vraag eerst van wie en waarover het ging.' },
          ]}
          chips={[
            { label: 'Wie wacht het langst?', prompt: 'Wie wacht in WhatsApp het langst op een antwoord van mij?' },
            { label: 'Alleen groepen', prompt: 'Welke WhatsApp-groepen hebben ongelezen berichten?' },
          ]}
          samenvatting={<>
            <div className="telrij"><b>{data?.ok ? data.unread : 0}</b> ongelezen berichten</div>
            <div className="telrij"><b>{chats.length}</b> chats die wachten</div>
          </>}
          kinderen={<p className="rail-tekst">WhatsApp loopt via je eigen laptop. Staat die uit, dan staat deze kaart stil — dat is de prijs van berichten die je machine niet verlaten.</p>}
        />
      </div>

      <SchermVoet />
    </>
  );
}
