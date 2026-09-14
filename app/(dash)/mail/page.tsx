'use client';

import React, { useMemo, useState } from 'react';
import { Ico, SchermKop, SchermVoet, NietGekoppeld, Skelet } from '@/components/ui';
import { BobRail } from '@/components/BobRail';
import { useApi } from '@/components/hooks';

import { MailLijst, MailLezen, type Bericht } from '@/components/Mail';

export default function MailScherm() {
  const { data, bezig, opnieuw } = useApi<any>('/api/mail');
  const [gekozen, setGekozen] = useState(0);
  const [zoek, setZoek] = useState('');
  const [tab, setTab] = useState<'inbox' | 'gmail' | 'outlook'>('inbox');

  const berichten: Bericht[] = useMemo(() => {
    const g = (data?.gmail?.messages ?? []).map((m: any) => ({ ...m, bron: 'gmail' as const }));
    const o = (data?.outlook?.messages ?? []).map((m: any) => ({ ...m, bron: 'outlook' as const }));
    return [...g, ...o].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [data]);

  const zichtbaar = berichten.filter((m) =>
    (tab === 'inbox' || m.bron === tab) &&
    (!zoek || `${m.from} ${m.subject}`.toLowerCase().includes(zoek.toLowerCase())));

  const nietGekoppeld = !bezig && !data?.ok;

  return (
    <>
      <SchermKop
        kleur="#0d5138" icoon={<Ico.mail />} titel="Mail" onder="Je inbox, slimmer met Bob."
        citaat="„Minder mail, meer wat ertoe doet.”"
        acties={<button className="btn-ghost" onClick={opnieuw}><Ico.ververs />Verversen</button>}
      />

      <div className="tabrow">
        {([['inbox', 'Inbox', berichten.length],
           ['gmail', 'Gmail', data?.gmail?.unread ?? 0],
           ['outlook', 'Outlook', data?.outlook?.unread ?? 0]] as const).map(([k, l, n]) => (
          <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k as any)}>
            {l}<span className="tab-n">{n}</span>
          </button>
        ))}
      </div>

      <div className="cols cols-mail">
        <div className="card list-card">
          <div className="list-head">
            <input className="list-search" type="search" placeholder="Zoek in berichten…" value={zoek}
              onChange={(e) => setZoek(e.target.value)} aria-label="Zoek in berichten" />
            <span className="list-sort">Meest recent</span>
          </div>
          <div className="list">
            {bezig ? <Skelet />
              : nietGekoppeld ? <NietGekoppeld titel="Mail nog niet gekoppeld" uitleg="Koppel Google en/of Microsoft in de instellingen." knop={{ tekst: 'Naar instellingen', href: '/instellingen' }} />
              : <MailLijst berichten={zichtbaar} gekozen={gekozen} kies={setGekozen} />}
          </div>
        </div>

        <div className="card read-card">
          <MailLezen bericht={zichtbaar.find((m) => m.id === berichten[gekozen]?.id) ?? zichtbaar[0]} />
        </div>

        <BobRail
          intro="Actief met je mail"
          opdracht={{ titel: 'check Mail', onder: 'Ik kijk je mail na en vat hem samen.', prompt: 'Vat mijn ongelezen mail samen: wat vraagt echt om een antwoord vandaag, en wat kan wachten?' }}
          kaarten={[
            { ico: <Ico.ster />, titel: 'Filter belangrijk', onder: 'Toon alleen wat actie vraagt', prompt: 'Welke van mijn ongelezen mails vragen echt om actie? Zet ze op volgorde van urgentie.' },
            { ico: <Ico.lijst />, titel: 'Bundel nieuwsbrieven', onder: 'Zet ze op één hoop', prompt: 'Welke van mijn ongelezen mails zijn nieuwsbrieven of reclame? Vat ze in één alinea samen.' },
            { ico: <Ico.pen />, titel: 'Schrijf antwoord', onder: 'Laat Bob een concept maken', prompt: 'Schrijf een concept-antwoord op de mail die het meest urgent is. Vraag me eerst welke toon je moet aanhouden.' },
            { ico: <Ico.klok />, titel: 'Markeer follow-up', onder: 'Zet acties uit mail klaar', prompt: 'Welke afspraken of taken volgen er uit mijn ongelezen mail? Geef ze als lijstje dat ik in Todoist kan zetten.' },
          ]}
          chips={[
            { label: 'Toon alleen ongelezen', prompt: 'Toon alleen mijn ongelezen berichten, met afzender en onderwerp.' },
            { label: 'Zoek afspraken', prompt: 'Staan er afspraakvoorstellen in mijn mail? Noem datum, tijd en wie het vraagt.' },
            { label: 'Plan een follow-up', prompt: 'Op welke mails moet ik deze week nog terugkomen?' },
          ]}
          samenvatting={
            <>
              <div className="telrij"><b>{data?.gmail?.unread ?? 0}</b> ongelezen in Gmail</div>
              <div className="telrij"><b>{data?.outlook?.unread ?? 0}</b> ongelezen in Outlook</div>
              <div className="telrij"><b>{berichten.length}</b> in de lijst</div>
            </>
          }
        />
      </div>

      <SchermVoet />
    </>
  );
}
