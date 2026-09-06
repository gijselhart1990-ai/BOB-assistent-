'use client';

import React, { useState } from 'react';
import { Ico } from '@/components/ui';
import { useBob } from '@/components/Shell';

/**
 * Het Bob-paneel dat rechts op elk doorlinkscherm staat.
 *
 * De knoppen sturen een echte vraag naar Claude en het antwoord verschijnt
 * hier — niet op een ander scherm dat je op dat moment niet ziet.
 */

export type RailKaart = { ico: React.ReactNode; titel: string; onder: string; prompt: string };

export function BobRail({ intro, opdracht, kaarten, chips, samenvatting, kinderen }: {
  intro: string;
  opdracht: { titel: string; onder: string; prompt: string };
  kaarten: RailKaart[];
  chips: { label: string; prompt: string }[];
  samenvatting?: React.ReactNode;
  kinderen?: React.ReactNode;
}) {
  const { vraag, gesprek, bezig } = useBob();
  const [tekst, setTekst] = useState('');

  return (
    <aside className="bob-rail">
      <span className="rail-ghost" aria-hidden="true" />

      <header className="rail-head">
        <span className="rail-avatar"><Ico.vonk /></span>
        <div><b>Bob Assistent</b><small>{intro}</small></div>
      </header>

      <button className="rail-command" onClick={() => vraag(opdracht.prompt)} disabled={bezig}>
        <span className="rail-command-dot" />
        <span><b>BOB opdracht: {opdracht.titel}</b><small>{opdracht.onder}</small></span>
        <span className="rail-arrow">›</span>
      </button>

      <div className="rail-grid">
        {kaarten.map((k) => (
          <button key={k.titel} className="rail-card" onClick={() => vraag(k.prompt)} disabled={bezig}>
            <span className="rail-ico">{k.ico}</span>
            <b>{k.titel}</b><small>{k.onder}</small>
            <span className="rail-arrow">›</span>
          </button>
        ))}
      </div>

      {samenvatting && <div className="rail-summary"><h4>Samenvatting</h4>{samenvatting}</div>}
      {kinderen}

      {gesprek.length > 0 && (
        <div className="rail-thread">
          {gesprek.slice(-6).map((m, i) => (
            <div key={i} className={`msg ${m.rol}`}>
              {m.tekst}
              {m.stappen?.length ? <div className="msg-steps">{m.stappen.map(stapTekst).join(' · ')}</div> : null}
            </div>
          ))}
          {bezig && <div className="msg bob thinking">BOB denkt na…</div>}
        </div>
      )}

      <form className="rail-ask" onSubmit={(e) => { e.preventDefault(); vraag(tekst); setTekst(''); }}>
        <input type="text" placeholder="Geef een opdracht aan Bob…" value={tekst} onChange={(e) => setTekst(e.target.value)} aria-label="Opdracht aan Bob" />
        <button type="submit" aria-label="Versturen" disabled={bezig}><Ico.pijl /></button>
      </form>

      <div className="rail-chips">
        {chips.map((c) => (
          <button key={c.label} className="chip" onClick={() => vraag(c.prompt)} disabled={bezig}>{c.label}</button>
        ))}
      </div>
    </aside>
  );
}

const host = (u?: string) => { try { return new URL(u!).hostname.replace(/^www\./, ''); } catch { return u || ''; } };

/** Wat BOB onderweg deed, in gewone taal. */
export function stapTekst(s: { tool: string; input: any }) {
  const i = s.input || {};
  switch (s.tool) {
    case 'web_search': return `zocht op “${i.query}”`;
    case 'web_read': return `las ${host(i.url)}`;
    case 'agenda': return 'keek in je agenda';
    case 'mail': return 'keek in je mail';
    case 'taken': return 'keek naar je taken';
    case 'browser_goto': return `opende ${host(i.url)}`;
    case 'browser_read': return 'las de pagina';
    case 'browser_elements': return 'keek wat er op de pagina staat';
    case 'browser_click': return `klikte op “${i.element}”`;
    case 'browser_type': return `vulde “${i.field}” in`;
    case 'browser_press': return `drukte ${i.key}`;
    default: return s.tool;
  }
}
