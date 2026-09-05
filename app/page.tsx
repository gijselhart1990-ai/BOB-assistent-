'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, CircleUserRound, Globe2, LockKeyhole, LogOut, Mail, MessageCircle, Mic, Search, Send, Settings, ShieldCheck, Sparkles, UsersRound, X } from 'lucide-react';

const AUTH_BASE = 'https://x8ki-letl-twmt.n7.xano.io/api:vFO3tX2k';
const ALLOWED_EMAIL = 'gijselhart1990@gmail.com';
const TOKEN_KEY = 'bob-xano-token';

const spaces = [
  { id: 'whatsapp', title: 'WhatsApp', subtitle: 'Slimmer communiceren', icon: MessageCircle, image: '/bob-whatsapp.jpeg' },
  { id: 'mail', title: 'Mail', subtitle: 'Inbox onder controle', icon: Mail, image: '/bob-mail.jpeg' },
  { id: 'google', title: 'Google Workspace', subtitle: 'Mail, agenda, Drive en foto’s', icon: CalendarDays, image: '/bob-google.jpeg' },
  { id: 'social', title: 'Social media', subtitle: 'Kanalen en content', icon: UsersRound, image: '/bob-social.jpeg' },
  { id: 'web', title: 'Web Assistent', subtitle: 'Zoeken, lezen en handelen', icon: Globe2, image: '/bob-web.jpeg' },
];

const replies = [
  'Ik heb je opdracht ontvangen. Ik zet de belangrijkste stappen voor je klaar.',
  'Begrepen. Ik controleer je gekoppelde omgevingen en geef je zo een helder overzicht.',
  'Ik ga ermee aan de slag. Je kunt mijn voortgang hier blijven volgen.',
];

export default function Home() {
  const [authState, setAuthState] = useState<'loading' | 'signed-out' | 'signed-in'>('loading');
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [active, setActive] = useState<(typeof spaces)[number] | null>(null);
  const [command, setCommand] = useState('');
  const [answer, setAnswer] = useState('Goedemiddag Sander. Wat kan ik voor je doen?');
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthState('signed-out');
      return;
    }
    fetch(`${AUTH_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error('Sessie verlopen');
        setAuthState('signed-in');
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        setAuthState('signed-out');
      });
  }, []);

  useEffect(() => {
    if (authState !== 'signed-in') return;
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    void register({
      name: 'submit_bob_command', title: 'Geef BOB een opdracht',
      description: 'Voer een korte opdracht in en toon BOBs reactie in het dashboard.',
      inputSchema: { type: 'object', properties: { command: { type: 'string', minLength: 1, maxLength: 500 } }, required: ['command'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(input: unknown) {
        const command = typeof input === 'object' && input && 'command' in input ? String((input as { command: unknown }).command).trim() : '';
        if (!command) throw new Error('Een opdracht is verplicht.');
        const response = replies[command.length % replies.length];
        setAnswer(response);
        setCommand('');
        return { status: 'received', response };
      },
    });
    void register({
      name: 'open_bob_environment', title: 'Open een BOB-omgeving',
      description: 'Open WhatsApp, Mail, Google Workspace, Social media of de Web Assistent in het dashboard.',
      inputSchema: { type: 'object', properties: { environment: { type: 'string', enum: spaces.map((item) => item.id) } }, required: ['environment'], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input: unknown) {
        const id = typeof input === 'object' && input && 'environment' in input ? String((input as { environment: unknown }).environment) : '';
        const environment = spaces.find((item) => item.id === id);
        if (!environment) throw new Error('Onbekende BOB-omgeving.');
        setActive(environment);
        return { opened: environment.id, title: environment.title };
      },
    });
    return () => lifecycle.abort();
  }, [authState]);

  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError('');
    if (!/^\d{6}$/.test(pin)) {
      setAuthError('Kies een pincode van precies 6 cijfers.');
      return;
    }
    if (authMode === 'register' && pin !== confirmPin) {
      setAuthError('De pincodes zijn niet hetzelfde.');
      return;
    }
    setAuthBusy(true);
    try {
      const endpoint = authMode === 'register' ? 'signup' : 'login';
      const body = authMode === 'register'
        ? { name: 'Sander Gijselhart', email: ALLOWED_EMAIL, password: pin }
        : { email: ALLOWED_EMAIL, password: pin };
      const response = await fetch(`${AUTH_BASE}/auth/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({})) as { authToken?: string; message?: string };
      if (!response.ok || !data.authToken) {
        if (authMode === 'register' && response.status === 400) throw new Error('Dit account bestaat mogelijk al. Kies Inloggen.');
        throw new Error(data.message || 'De combinatie van e-mailadres en pincode klopt niet.');
      }
      window.localStorage.setItem(TOKEN_KEY, data.authToken);
      setPin('');
      setConfirmPin('');
      setAuthState('signed-in');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Inloggen is niet gelukt. Probeer het opnieuw.');
    } finally {
      setAuthBusy(false);
    }
  }

  function signOut() {
    window.localStorage.removeItem(TOKEN_KEY);
    setAuthState('signed-out');
    setAuthMode('login');
    setActive(null);
  }

  function submit() {
    const value = command.trim();
    if (!value) return;
    setAnswer(replies[value.length % replies.length]);
    setCommand('');
  }

  if (authState !== 'signed-in') {
    return (
      <main className="auth-shell">
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        <section className="auth-card" aria-busy={authState === 'loading'}>
          <div className="auth-orb"><Sparkles size={34} /></div>
          <span className="eyebrow">BEVEILIGDE TOEGANG</span>
          <h1>Welkom bij BOB</h1>
          {authState === 'loading' ? <p className="auth-loading">Je beveiligde sessie wordt gecontroleerd…</p> : <>
            <p>Registreer eenmalig en kies je persoonlijke pincode. Daarna log je eenvoudig in op iedere standaard internetbrowser.</p>
            <div className="auth-tabs" role="tablist" aria-label="Registreren of inloggen">
              <button className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setAuthError(''); }}>Registreren</button>
              <button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthError(''); }}>Inloggen</button>
            </div>
            <form className="auth-form" onSubmit={authenticate}>
              <label>E-mailadres<input type="email" value={ALLOWED_EMAIL} readOnly /></label>
              <label>Persoonlijke pincode<div className="pin-field"><LockKeyhole size={19} /><input type="password" inputMode="numeric" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 cijfers" /></div></label>
              {authMode === 'register' && <label>Herhaal pincode<div className="pin-field"><ShieldCheck size={19} /><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Nogmaals 6 cijfers" /></div></label>}
              {authError && <div className="auth-error" role="alert">{authError}</div>}
              <button className="auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Even geduld…' : authMode === 'register' ? 'Account aanmaken' : 'BOB openen'}</button>
            </form>
            <small className="privacy-note"><ShieldCheck size={15} /> Je pincode wordt veilig via HTTPS verzonden en nooit in deze browser opgeslagen.</small>
          </>}
        </section>
      </main>
    );
  }

  return (
    <main className="bob-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <button className="brand" onClick={() => setActive(null)} aria-label="Ga naar BOB home"><span className="brand-mark"><Sparkles size={23} /></span><span>BOB</span></button>
        <div className="global-search"><Search size={20} /><span>Zoek in BOB of stel een vraag…</span><kbd>⌘ K</kbd></div>
        <nav className="top-actions" aria-label="Account"><button aria-label="Zoeken"><Search /></button><button aria-label="Instellingen"><Settings /></button><button className="avatar" aria-label="Profiel"><CircleUserRound /></button><button onClick={signOut} aria-label="Uitloggen" title="Uitloggen"><LogOut /></button></nav>
      </header>

      <section className="dashboard" aria-label="BOB dashboard">
        <div className="intro"><span className="eyebrow"><span className="live-dot" /> BOB IS ONLINE</span><h1>Jouw slimme assistent</h1><p>Één plek om te communiceren, plannen, zoeken en creëren.</p></div>
        <div className="workspace-grid">
          <section className="hero-card">
            <img src="/bob-home.jpeg" alt="Holografisch BOB-assistentdashboard" /><div className="hero-shade" />
            <div className="hero-copy"><span>Analyseren · Begrijpen · Verbinden</span><h2>BOB denkt met je mee</h2><p>Van idee naar actie, terwijl jij de controle houdt.</p></div>
          </section>
          <aside className="assistant-card">
            <div className="assistant-heading"><span className="assistant-orb"><Sparkles /></span><div><strong>BOB Assistent</strong><small>Actief en klaar voor je opdracht</small></div></div>
            <div className="answer-bubble">{answer}</div>
            <div className="suggestions"><button onClick={() => setCommand('Vat mijn dag samen')}>Vat mijn dag samen</button><button onClick={() => setCommand('Controleer mijn berichten')}>Check berichten</button><button onClick={() => setCommand('Plan mijn belangrijkste taken')}>Plan taken</button></div>
            <div className="commandbar"><button className={listening ? 'mic listening' : 'mic'} onClick={() => setListening(!listening)} aria-label="Spraakopdracht"><Mic size={20} /></button><input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder={listening ? 'Ik luister…' : 'Geef BOB een opdracht…'} /><button className="send" onClick={submit} aria-label="Verstuur opdracht"><Send size={18} /></button></div>
          </aside>
        </div>

        <section className="spaces" aria-labelledby="spaces-title">
          <div className="section-title"><div><span className="eyebrow">OMGEVINGEN</span><h2 id="spaces-title">Alles verbonden</h2></div><span>Open een omgeving</span></div>
          <div className="space-grid">{spaces.map((space) => { const Icon = space.icon; return <button className="space-card" key={space.id} onClick={() => setActive(space)}><span className="space-icon"><Icon /></span><span><strong>{space.title}</strong><small>{space.subtitle}</small></span><ChevronRight className="arrow" /></button>; })}</div>
        </section>
      </section>

      {active && <div className="portal" role="dialog" aria-modal="true" aria-label={active.title}><div className="portal-window"><div className="portal-head"><div><span className="eyebrow">BOB OMGEVING</span><h2>{active.title}</h2><p>{active.subtitle}</p></div><button onClick={() => setActive(null)} aria-label="Sluiten"><X /></button></div><img src={active.image} alt={`${active.title} interface van BOB`} /></div></div>}
    </main>
  );
}
