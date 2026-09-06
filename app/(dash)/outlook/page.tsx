'use client';

import React, { useEffect, useState } from 'react';
import { Ico, SchermKop, SchermVoet, NietGekoppeld, Skelet } from '@/components/ui';
import { BobRail } from '@/components/BobRail';
import { useApi } from '@/components/hooks';
import { MailLijst, MailLezen, type Bericht } from '@/components/Mail';

const MAPPEN: [React.ReactNode, string, string][] = [
  [<Ico.postvak key="i" />, 'Postvak IN', 'https://outlook.office.com/mail/inbox'],
  [<Ico.ster key="s" />, 'Met ster', 'https://outlook.office.com/mail/'],
  [<Ico.pijl key="v" />, 'Verzonden', 'https://outlook.office.com/mail/sentitems'],
  [<Ico.pen key="c" />, 'Concepten', 'https://outlook.office.com/mail/drafts'],
  [<Ico.archief key="a" />, 'Archief', 'https://outlook.office.com/mail/archive'],
  [<Ico.agenda key="ag" />, 'Agenda', 'https://outlook.office.com/calendar/'],
];

export default function OutlookScherm() {
  const { data, bezig, opnieuw } = useApi<any>('/api/mail');
  const [gekozen, setGekozen] = useState(0);
  const [nu, setNu] = useState<Date | null>(null);

  useEffect(() => {
    setNu(new Date());
    const t = setInterval(() => setNu(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const berichten: Bericht[] = (data?.outlook?.messages ?? []).map((m: any) => ({ ...m, bron: 'outlook' as const }));
  const o = data?.outlook;

  return (
    <>
      <SchermKop
        kleur="#0f6cbd" icoon={<Ico.outlook />} titel="Outlook" onder="Je mailbox, slimmer met Bob."
        citaat="„BOB beheert, sorteert en geeft je overzicht.”"
        extra={nu ? (
          <div className="clock-card">
            <b>{nu.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</b>
            <small>{nu.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase())}</small>
          </div>
        ) : null}
        acties={<>
          <button className="btn-ghost" onClick={opnieuw}><Ico.ververs />Verversen</button>
          <a className="btn-primary" href="https://outlook.office.com/mail/" target="_blank" rel="noopener">Open Outlook</a>
        </>}
      />

      <div className="cols cols-outlook">
        <nav className="card folders">
          <h3>Mappen</h3>
          {MAPPEN.map(([ico, label, href], i) => (
            <a className={`folder${i === 0 ? ' on' : ''}`} key={label} href={href} target="_blank" rel="noopener">
              {ico}<span>{label}</span>{i === 0 && o?.ok ? <em>{o.unread}</em> : null}
            </a>
          ))}
        </nav>

        <div className="card list-card">
          <div className="list-head">
            <b>Postvak IN</b>
            <span className={`pill${o?.ok ? '' : ' muted'}`}>{o?.ok ? `${o.unread} ongelezen` : 'uit'}</span>
          </div>
          <div className="list">
            {bezig ? <Skelet />
              : !o?.ok ? <NietGekoppeld titel="Outlook nog niet gekoppeld" uitleg="Koppel je Microsoft-account in de instellingen." knop={{ tekst: 'Naar instellingen', href: '/instellingen' }} />
              : <MailLijst berichten={berichten} gekozen={gekozen} kies={setGekozen} />}
          </div>
        </div>

        <div className="card read-card"><MailLezen bericht={berichten[gekozen]} /></div>

        <BobRail
          intro="Actief met Outlook"
          opdracht={{ titel: 'check Outlook', onder: 'Je e-mail, georganiseerd en onder controle.', prompt: 'Kijk mijn Outlook na: wat is urgent, wat vraagt een antwoord en wat kan weg?' }}
          kaarten={[
            { ico: <Ico.ster />, titel: 'Prioriteer belangrijke mails', onder: 'Markeer wat aandacht vraagt', prompt: 'Zet mijn ongelezen Outlook-berichten op volgorde van urgentie en zeg per stuk waarom.' },
            { ico: <Ico.document />, titel: 'Maak samenvatting', onder: 'Alle ongelezen in heldere punten', prompt: 'Vat mijn ongelezen Outlook-mail samen in korte punten.' },
            { ico: <Ico.antwoord />, titel: 'Schrijf concept antwoord', onder: 'Genereer een professioneel antwoord', prompt: 'Schrijf een concept-antwoord op het Outlook-bericht dat bovenaan staat.' },
            { ico: <Ico.agenda />, titel: 'Plan follow-up', onder: 'Zet acties in je agenda', prompt: 'Welke follow-ups volgen uit mijn mail? Stel per stuk een moment voor deze week voor.' },
          ]}
          chips={[
            { label: 'Beantwoord urgente mails', prompt: 'Welke mails moet ik vandaag nog beantwoorden? Schrijf per stuk een openingszin.' },
            { label: 'Vandaag in mijn agenda', prompt: 'Wat staat er vandaag in mijn agenda, en waar zitten de gaten?' },
            { label: 'Archiveer-advies', prompt: 'Welke ongelezen mails kan ik zonder risico wegzetten?' },
          ]}
          samenvatting={<>
            <div className="telrij"><b>{o?.unread ?? 0}</b> ongelezen berichten</div>
            <div className="telrij"><b>{berichten.length}</b> in de lijst</div>
          </>}
        />
      </div>

      <SchermVoet />
    </>
  );
}
