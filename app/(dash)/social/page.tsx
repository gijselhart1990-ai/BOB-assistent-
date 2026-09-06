'use client';

import React from 'react';
import { Ico, SchermKop, SchermVoet, KaartKop, Notitie, Skelet } from '@/components/ui';
import { BobRail } from '@/components/BobRail';
import { useApi } from '@/components/hooks';

const KLEUR: Record<string, string> = { linkedin: '#0a66c2', instagram: '#e1306c', facebook: '#1877f2', tiktok: '#111827' };
const LINK: Record<string, string> = {
  linkedin: 'https://www.linkedin.com/feed/', instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/', tiktok: 'https://www.tiktok.com/',
};
const MERK: Record<string, React.ReactNode> = {
  linkedin: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3.5" y="9.5" width="3.4" height="11" rx=".6" /><circle cx="5.2" cy="5.4" r="2" /><path d="M10.4 9.5h3.2v1.6a3.6 3.6 0 0 1 3.2-1.8c2.6 0 3.7 1.7 3.7 4.3v6.9h-3.4v-6.2c0-1.4-.5-2.1-1.6-2.1-1.2 0-1.8.8-1.8 2.2v6.1h-3.3z" /></svg>,
  instagram: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="16.9" cy="7.1" r="1.1" fill="currentColor" stroke="none" /></svg>,
  facebook: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.9 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1A22 22 0 0 0 14.7 3c-2.5 0-4.2 1.5-4.2 4.3v2.3H7.7v3.2h2.8V21z" /></svg>,
  tiktok: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M9.5 12.8a3.4 3.4 0 1 0 3.4 3.4V4.2" /><path d="M12.9 6.6a4.6 4.6 0 0 0 4.4 3.3" /></svg>,
};

export default function SocialScherm() {
  const { data, bezig, opnieuw } = useApi<any>('/api/social');
  const items = data?.items ?? [];

  return (
    <>
      <SchermKop kleur="#8b5cf6" icoon={<Ico.social />} titel="Social Media" onder="Eén overzicht. Alle kanalen. Meer impact."
        citaat="„Van berichten naar betekenis.”"
        acties={<button className="btn-ghost" onClick={opnieuw}><Ico.ververs />Verversen</button>} />

      <div className="stat-row">
        {bezig ? <Skelet /> : items.map((p: any) => (
          <div className="stat" key={p.id}>
            <span className="stat-ico" style={{ ['--c' as string]: KLEUR[p.id] } as React.CSSProperties}>{MERK[p.id]}</span>
            <b>{p.ok ? p.value : '—'}</b>
            <small>{p.ok ? `${p.label} · ${p.unit ?? 'nieuw'}` : `${p.label} · ${p.reason ?? 'niet gekoppeld'}`}</small>
          </div>
        ))}
      </div>

      <div className="cols cols-social">
        <div className="card">
          <KaartKop kleur="#8b5cf6" icoon={<Ico.social />} titel="Kanalen" onder="Wat er binnenkomt" />
          <div className="card-body">
            <div className="app-grid">
              {items.map((p: any) => (
                <a className="app-tile" key={p.id} href={LINK[p.id]} target="_blank" rel="noopener"
                  style={{ ['--c' as string]: KLEUR[p.id] } as React.CSSProperties}>
                  <span className="app-glyph">{MERK[p.id]}</span>
                  <span className="app-num">{p.ok ? p.value : '—'}</span>
                  <span className="app-name">{p.label}</span>
                  <span className="app-note">{p.ok ? (p.unit ?? 'nieuw') : 'niet gekoppeld'}</span>
                </a>
              ))}
              {!items.length && !bezig && <p className="empty">Nog geen kanalen gekoppeld.</p>}
            </div>
          </div>
        </div>

        <BobRail
          intro="Actief met je kanalen"
          opdracht={{ titel: 'open social media', onder: 'Van berichten naar betekenis.', prompt: 'Help me met mijn social media. Vraag eerst voor welk kanaal en wat ik wil bereiken.' }}
          kaarten={[
            { ico: <Ico.chat />, titel: 'Schrijf een post', onder: 'Bob maakt een concept', prompt: 'Schrijf een LinkedIn-post voor me. Vraag eerst waarover, voor wie en welke toon.' },
            { ico: <Ico.antwoord />, titel: 'Beantwoord reacties', onder: 'Concepten voor je reacties', prompt: 'Help me reacties beantwoorden. Vraag eerst welke reactie en in welke toon.' },
            { ico: <Ico.agenda />, titel: 'Plan posts', onder: 'Zet een weekplanning op', prompt: 'Maak een contentplanning voor deze week over mijn werk. Vraag eerst welke kanalen en hoeveel posts.' },
            { ico: <Ico.staaf />, titel: 'Maak samenvatting', onder: 'Wat er speelt in je vakgebied', prompt: 'Zoek op het web wat er deze week speelt in mijn vakgebied en vat het samen als inspiratie voor een post. Noem de bronnen.' },
          ]}
          chips={[
            { label: 'Ideeën voor deze week', prompt: 'Geef me vijf postideeën die passen bij mijn werk.' },
            { label: 'Herschrijf korter', prompt: 'Herschrijf een tekst korter en scherper. Vraag me eerst om de tekst.' },
            { label: 'Beste moment', prompt: 'Wanneer kan ik het beste posten voor mijn doelgroep?' },
          ]}
        />
      </div>

      <Notitie titel="Wat je hier wél en niet ziet.">
        De tellers komen uit de platforms zelf, maar alleen voor de kanalen waarvoor een token is ingevuld.
        Berichten, DM’s en statistieken per post vereisen per platform een eigen app-registratie met leesrechten.
        Zolang die er niet is, verzint BOB geen cijfers — dan staat er een streepje.
      </Notitie>

      <SchermVoet />
    </>
  );
}
