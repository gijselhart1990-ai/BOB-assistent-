'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ico } from '@/components/ui';
import { haal } from '@/lib/client';
import { GoogleAccountPicker } from './GoogleAccountPicker';

/* ============================================================
   De schil om elk scherm: balk bovenin, zijbalk, spraak, toasts
   en de toestemmingsvraag.
   ============================================================ */

type Toast = { id: number; tekst: string; soort?: 'ok' | 'err' };
type Bericht = { rol: 'me' | 'bob'; tekst: string; stappen?: { tool: string; input: any }[] };

type BobCtx = {
  vraag: (tekst: string, opties?: { uitspreken?: boolean }) => Promise<void>;
  gesprek: Bericht[];
  bezig: boolean;
  toast: (tekst: string, soort?: 'ok' | 'err') => void;
  brugOnline: boolean;
};

const Ctx = createContext<BobCtx | null>(null);
export const useBob = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBob buiten de Shell gebruikt');
  return c;
};

const PLAATSHOUDER: Record<string, string> = {
  '/': 'Vraag BOB iets, of zoek…',
  '/mail': 'Zoek in je mail…',
  '/outlook': 'Zoek in Outlook of vraag Bob iets…',
  '/whatsapp': 'Zoek in WhatsApp of vraag het aan Bob…',
  '/koppelen': 'Zoek in Bob of stel een vraag…',
  '/google': 'Zoek in Gmail, Agenda of vraag Bob iets…',
  '/social': 'Zoek in je social media, vraag Bob of typ opdracht…',
  '/web': 'Zoek een website of vraag iets aan Bob…',
  '/taken': 'Zoek of maak een taak…',
  '/administratie': 'Vraag BOB over facturen of administratie…',
  '/workflows': 'Zoek of ontwerp een workflow…',
  '/security': 'Zoek in beveiliging en auditlog…',
  '/instellingen': 'Zoek in Bob of stel een vraag…',
};

const NAV = [
  { pad: '/', label: 'Vandaag', kleur: '#14724f', ico: <Ico.huis /> },
  { pad: '/mail', label: 'Mail', kleur: '#0d5138', ico: <Ico.mail />, badge: 'mail' },
  { pad: '/outlook', label: 'Outlook', kleur: '#0f6cbd', ico: <Ico.outlook />, badge: 'outlook' },
  { pad: '/whatsapp', label: 'WhatsApp', kleur: '#25d366', ico: <Ico.wa />, badge: 'wa' },
  { pad: '/google', label: 'Google Workspace', kleur: '#4285f4', ico: <Ico.google />, badge: 'gmail' },
  { pad: '/social', label: 'Social Media', kleur: '#8b5cf6', ico: <Ico.social /> },
  { pad: '/web', label: 'Web Assistent', kleur: '#1a9464', ico: <Ico.web /> },
  { pad: '/taken', label: 'Takenhub', kleur: '#0ea5e9', ico: <Ico.taken /> },
  { pad: '/administratie', label: 'Administratie', kleur: '#f59e0b', ico: <Ico.factuur /> },
  { pad: '/workflows', label: 'Workflows', kleur: '#7c3aed', ico: <Ico.workflow /> },
  { pad: '/security', label: 'Security & logboek', kleur: '#dc2626', ico: <Ico.schild /> },
];

export function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  const pad = usePathname() || '/';
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [gesprek, setGesprek] = useState<Bericht[]>([]);
  const [bezig, setBezig] = useState(false);
  const [historieLaden, setHistorieLaden] = useState(true);
  const [vraagTekst, setVraagTekst] = useState('');
  const [brugOnline, setBrugOnline] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [ingeklapt, setIngeklapt] = useState(false);

  const [openVraag, setOpenVraag] = useState<{ id: string; omschrijving: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toast = useCallback((tekst: string, soort?: 'ok' | 'err') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tekst, soort }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), soort === 'err' ? 7000 : 3800);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    haal<{ messages: { rol: string; inhoud: string }[] }>('/api/chat', { signal: controller.signal })
      .then(r => {
        if (!controller.signal.aborted) setGesprek(r.messages.map(m => ({ rol: m.rol === 'assistant' ? 'bob' : 'me', tekst: m.inhoud })));
      })
      .catch(() => { if (!controller.signal.aborted) toast('Eerdere gesprekken konden niet worden geladen.', 'err'); })
      .finally(() => { if (!controller.signal.aborted) setHistorieLaden(false); });
    return () => controller.abort();
  }, [toast]);

  /* ---- thema onthouden ---- */
  useEffect(() => {
    try {
      const opgeslagen = localStorage.getItem('bob-thema');
      if (opgeslagen) document.documentElement.dataset.theme = opgeslagen;
    } catch { /* privémodus */ }
  }, []);

  /* ---- status en badges ---- */
  const laadStatus = useCallback(async () => {
    try {
      const s = await haal<any>('/api/status');
      setBrugOnline(Boolean(s.brug?.online));
    } catch { /* de pagina zelf werkt nog */ }
    try {
      const m = await haal<any>('/api/mail');
      setBadges((b) => ({ ...b, mail: (m.gmail?.unread || 0) + (m.outlook?.unread || 0), gmail: m.gmail?.unread || 0, outlook: m.outlook?.unread || 0 }));
    } catch { /* laat de badge leeg */ }
  }, []);

  useEffect(() => {
    laadStatus();
    const t = setInterval(laadStatus, 120_000);
    return () => clearInterval(t);
  }, [laadStatus]);

  /* ---- toestemming voor een actie ---- */
  const kijkOfErIetsWacht = useCallback(async () => {
    try {
      const r = await haal<any>('/api/web/pending');
      setOpenVraag(r.pending ?? null);
    } catch { /* volgende ronde weer */ }
  }, []);

  const beantwoord = useCallback(async (toestaan: boolean) => {
    if (!openVraag) return;
    const id = openVraag.id;
    setOpenVraag(null);
    try {
      await haal('/api/web/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, allow: toestaan }),
      });
    } catch (e) { toast((e as Error).message, 'err'); }
  }, [openVraag, toast]);

  /* ---- vragen aan BOB ---- */
  const vraag = useCallback(async (tekst: string) => {
    const q = tekst.trim();
    if (!q || bezig || historieLaden) return;
    setBezig(true);
    setGesprek((g) => [...g, { rol: 'me', tekst: q }]);

    if (!pollRef.current) pollRef.current = setInterval(kijkOfErIetsWacht, 900);
    try {
      const r = await haal<any>('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      setGesprek((g) => [...g, { rol: 'bob', tekst: r.text, stappen: r.steps }]);
      if (r.opgeslagen === false) toast('Dit antwoord is niet opgeslagen. Bewaar het voordat je de pagina ververst.', 'err');
    } catch (err) {
      setGesprek((g) => [...g, { rol: 'bob', tekst: `Dat lukte niet: ${(err as Error).message}` }]);
      toast((err as Error).message, 'err');
    } finally {
      setBezig(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setOpenVraag(null);
    }
  }, [bezig, historieLaden, kijkOfErIetsWacht, toast]);

  /* ---- sneltoetsen ---- */
  useEffect(() => {
    const opToets = (e: KeyboardEvent) => {
      const typt = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        (document.getElementById('omniboxInput') as HTMLInputElement)?.focus();
        return;
      }
      // Esc bij een openstaande vraag betekent "niet doen". Wegklikken mag
      // nooit per ongeluk toestemming worden.
      if (e.key === 'Escape' && openVraag) { e.preventDefault(); beantwoord(false); }
      if (typt) return;
    };
    document.addEventListener('keydown', opToets);
    return () => document.removeEventListener('keydown', opToets);
  }, [openVraag, beantwoord]);

  const vandaag = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Ctx.Provider value={{ vraag, gesprek, bezig: bezig || historieLaden, toast, brugOnline }}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 9.5 19 2.5 2.5 0 0 0 12 17" />
              <path d="M12 5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2A3 3 0 0 1 14.5 19 2.5 2.5 0 0 1 12 17" />
              <path d="M12 5v12" />
            </svg>
          </span>
          <span className="brand-name">Bob</span>
        </div>

        <form className="omnibox" onSubmit={(e) => { e.preventDefault(); vraag(vraagTekst); setVraagTekst(''); }}>
          <Ico.zoek className="omnibox-icon" />
          <input
            id="omniboxInput" type="text" autoComplete="off"
            disabled={historieLaden || bezig}
            placeholder={PLAATSHOUDER[pad] ?? 'Vraag BOB iets…'}
            value={vraagTekst} onChange={(e) => setVraagTekst(e.target.value)}
            aria-label="Vraag BOB iets"
          />
          <kbd className="omnibox-kbd">Ctrl+K</kbd>
        </form>

        <div className="topbar-actions">
          <button className="icon-btn" title="Ververs" onClick={() => { laadStatus(); location.reload(); }} aria-label="Ververs"><Ico.ververs /></button>
          <Link className="icon-btn" href="/instellingen" title="Instellingen" aria-label="Instellingen"><Ico.tandwiel /></Link>
          <div className="avatar" title={email}><span>{email[0]?.toUpperCase() ?? 'B'}</span><i className="presence" /></div>
        </div>
      </header>
      <GoogleAccountPicker />

      <div className={`shell${ingeklapt ? ' collapsed' : ''}`}>
        <nav className="sidebar">
          <ul className="nav">
            {NAV.map((n) => (
              <li key={n.pad}>
                <Link className={`nav-item${pad === n.pad ? ' active' : ''}`} href={n.pad}>
                  <span className="ni-tile" style={{ ['--c' as string]: n.kleur } as React.CSSProperties}>{n.ico}</span>
                  {n.label}
                  {n.badge && badges[n.badge] ? <span className="badge" data-count={badges[n.badge]}>{badges[n.badge]}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
          <div className="nav-divider" />
          <ul className="nav nav-secondary">
            <li><Link className="nav-item" href="/koppelen"><span className="ni-glyph"><Ico.koppel /></span>Koppelen</Link></li>
            <li><a className="nav-item" href="https://app.todoist.com" target="_blank" rel="noopener"><span className="ni-glyph"><Ico.extern /></span>Todoist openen</a></li>
            <li><Link className={`nav-item${pad === '/instellingen' ? ' active' : ''}`} href="/instellingen"><span className="ni-glyph"><Ico.tandwiel /></span>Instellingen</Link></li>
          </ul>
          <button className="collapse" onClick={() => setIngeklapt((v) => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            <span>Minimaliseer</span>
          </button>
        </nav>

        <main className="content">
          <div className="view">{children}</div>
        </main>
      </div>

      {openVraag && (
        <div className="confirm-layer">
          <div className="confirm-card">
            <div className="confirm-head">
              <span className="confirm-icon"><Ico.schild /></span>
              <div><h3>BOB wil iets doen</h3><p className="confirm-sub">In het venster op je laptop. Jij beslist.</p></div>
            </div>
            <p className="confirm-what">{openVraag.omschrijving}</p>
            <div className="confirm-actions">
              <button className="btn-ghost" onClick={() => beantwoord(false)} autoFocus>Niet doen</button>
              <button className="btn-primary" onClick={() => beantwoord(true)}>Toestaan</button>
            </div>
            <p className="confirm-note">Geen antwoord binnen twee minuten telt als weigeren.</p>
          </div>
        </div>
      )}

      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.soort ?? ''}`}>{t.tekst}</div>)}
      </div>

      <span hidden>{vandaag}</span>
    </Ctx.Provider>
  );
}
