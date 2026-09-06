import React from 'react';

/* ============================================================
   Bouwstenen die op meerdere schermen terugkomen.

   De pictogrammen zijn eigen vormen in de kleur van het merk —
   bewust geen nagemaakte logo's van Google, WhatsApp of Instagram.
   ============================================================ */

type S = React.SVGProps<SVGSVGElement>;
const lijn = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const Ico = {
  mail: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.2" /><path d="m3.6 7 8.4 6 8.4-6" /></svg>,
  outlook: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.2" /><path d="m3.6 7 8.4 6 8.4-6" /><path d="M7.5 10.5h3" /></svg>,
  wa: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M20.5 11.6a7.6 7.6 0 0 1-11.1 6.8L4.4 19.6l1.4-4.9A7.6 7.6 0 1 1 20.5 11.6z" /></svg>,
  google: (p: S) => <svg viewBox="0 0 24 24" {...lijn} strokeWidth={2.2} {...p}><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 12h-7" /></svg>,
  social: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><circle cx="9" cy="8.5" r="3" /><circle cx="17" cy="9.5" r="2.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M15.5 19a4.5 4.5 0 0 1 5-4.4" /></svg>,
  web: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><circle cx="12" cy="12" r="8.5" /><ellipse cx="12" cy="12" rx="4" ry="8.5" /><path d="M3.7 9.5h16.6M3.7 14.5h16.6" /></svg>,
  huis: (p: S) => <svg viewBox="0 0 24 24" {...lijn} strokeWidth={2} {...p}><path d="M3 10.5 12 4l9 6.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-6h5v6" /></svg>,
  agenda: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>,
  taken: (p: S) => <svg viewBox="0 0 24 24" {...lijn} strokeWidth={2.2} {...p}><path d="m4 8 2.5 2.5L11 6" /><path d="m4 16 2.5 2.5L11 14" /><path d="M14 9h6M14 17h6" /></svg>,
  ster: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M12 3.5 13.9 9.2 20 9.4l-4.9 3.6 1.8 5.8L12 15.4l-4.9 3.4 1.8-5.8L4 9.4l6.1-.2z" /></svg>,
  vonk: (p: S) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9z" /><circle cx="18.4" cy="5.2" r="1.5" /></svg>,
  chevron: (p: S) => <svg viewBox="0 0 24 24" {...lijn} strokeWidth={2.2} {...p}><path d="m9 18 6-6-6-6" /></svg>,
  ververs: (p: S) => <svg viewBox="0 0 24 24" {...lijn} strokeWidth={2} {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 4v5h-5" /></svg>,
  zoek: (p: S) => <svg viewBox="0 0 24 24" {...lijn} strokeWidth={2} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  micro: (p: S) => <svg viewBox="0 0 24 24" {...lijn} strokeWidth={2} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>,
  luid: (p: S) => <svg viewBox="0 0 24 24" {...lijn} strokeWidth={2} {...p}><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>,
  tandwiel: (p: S) => <svg viewBox="0 0 24 24" {...lijn} strokeWidth={1.7} {...p}><circle cx="12" cy="12" r="3.1" /><path d="M19.1 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V3a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>,
  schild: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M12 3l7 4v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V7z" /><path d="M12 9v4" /><path d="M12 16h.01" /></svg>,
  koppel: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M9.5 14.5 14.5 9.5" /><path d="M11 7.5 12.5 6a3.5 3.5 0 1 1 5 5L16 12.5" /><path d="M13 16.5 11.5 18a3.5 3.5 0 1 1-5-5L8 11.5" /></svg>,
  extern: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M13.5 3.5H6.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9.5z" /><path d="M13.5 3.5v6h6" /></svg>,
  document: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><path d="M8 8.5h8M8 12h8M8 15.5h4.5" /></svg>,
  pen: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M4 20.5 5 16 16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" /><path d="m14.5 6.5 3 3" /></svg>,
  klok: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  pijl: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="m4 12 16-8-6 16-2.5-6.5z" /></svg>,
  slot: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><rect x="5" y="10.5" width="14" height="9" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>,
  camera: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></svg>,
  cursor: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="m4 3 6.5 17 2.2-6.9L19.6 11z" /></svg>,
  vertaal: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M3.5 6h8M7.5 4v2M9.5 6c0 3.5-2.4 6.4-6 7.5" /><path d="M4.5 9.8c1.4 2 3.4 3.4 5.8 4" /><path d="m13 20 3.6-8.5L20.2 20M14.4 17h4.4" /></svg>,
  drive: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M12 3.5 21 19H3z" /><path d="M8.2 12.5h7.6" /></svg>,
  fotos: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><circle cx="12" cy="12" r="2.6" /><path d="M12 3.2v5M12 15.8v5M3.2 12h5M15.8 12h5" /></svg>,
  antwoord: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M9 15 4 10l5-5" /><path d="M4 10h9a7 7 0 0 1 7 7v2" /></svg>,
  staaf: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M4 19V9M10 19V5M16 19v-6M22 19H2" /></svg>,
  bliksem: (p: S) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13 3 5 14h6l-1 7 8-11h-6z" /></svg>,
  scherm: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 20h8" /></svg>,
  lijst: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M4 6h16M4 12h11M4 18h7" /></svg>,
  chat: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M20.5 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.4-4.9A7.5 7.5 0 1 1 20.5 11.5z" /></svg>,
  postvak: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><path d="M3.5 13h4l1.5 2.5h6L16.5 13h4" /><path d="M4.5 13 6.5 5.5h11L19.5 13v5a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18z" /></svg>,
  archief: (p: S) => <svg viewBox="0 0 24 24" {...lijn} {...p}><rect x="3.5" y="4.5" width="17" height="4" rx="1" /><path d="M5.5 8.5v10a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-10" /><path d="M10 12.5h4" /></svg>,
};

/* ---------------- kaartkop ---------------- */

export function KaartKop({ kleur, icoon, titel, onder, rechts }: {
  kleur: string; icoon: React.ReactNode; titel: string; onder?: string; rechts?: React.ReactNode;
}) {
  return (
    <header className="card-head">
      <span className="card-icon" style={{ ['--c' as string]: kleur } as React.CSSProperties}>{icoon}</span>
      <span className="card-titles"><h2>{titel}</h2>{onder && <small>{onder}</small>}</span>
      {rechts ?? <span className="card-more" aria-hidden="true"><Ico.chevron /></span>}
    </header>
  );
}

export function Pil({ tekst, soort }: { tekst: string; soort?: 'muted' | 'alert' }) {
  return <span className={`pill${soort ? ` ${soort}` : ''}`}>{tekst}</span>;
}

export function NietGekoppeld({ titel, uitleg, knop }: { titel: string; uitleg: string; knop?: { tekst: string; href: string } }) {
  return (
    <div className="notconnected">
      <b>{titel}</b>{uitleg}
      {knop && <a className="connect-btn" href={knop.href}>{knop.tekst}</a>}
    </div>
  );
}

export function Skelet() { return <div className="skeleton" />; }

/* ---------------- schermkop ---------------- */

export function SchermKop({ kleur, icoon, titel, onder, citaat, acties, extra }: {
  kleur: string; icoon: React.ReactNode; titel: string; onder: string;
  citaat?: string; acties?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <header className="view-head">
      <span className="view-icon" style={{ ['--c' as string]: kleur } as React.CSSProperties}>{icoon}</span>
      <div className="view-titles"><h1>{titel}</h1><p>{onder}</p></div>
      {citaat && <span className="view-quote">{citaat}</span>}
      {extra}
      <div className="view-actions">{acties}</div>
    </header>
  );
}

export function SchermVoet() {
  return (
    <div className="view-foot">
      <p className="stamp">MENS &nbsp;•&nbsp; AI &nbsp;•&nbsp; MEER MOGELIJK <span className="stamp-rule" /></p>
      <p className="signature">Good ideas<br />go further</p>
    </div>
  );
}

export function Notitie({ titel, children }: { titel: string; children: React.ReactNode }) {
  return <div className="note-card"><b>{titel}</b>{children}</div>;
}
