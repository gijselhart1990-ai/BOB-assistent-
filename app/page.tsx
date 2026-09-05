'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, CircleUserRound, Globe2, Mail, MessageCircle, Mic, Search, Send, Settings, Sparkles, UsersRound, X } from 'lucide-react';

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
  const [active, setActive] = useState<(typeof spaces)[number] | null>(null);
  const [command, setCommand] = useState('');
  const [answer, setAnswer] = useState('Goedemiddag Sander. Wat kan ik voor je doen?');
  const [listening, setListening] = useState(false);

  useEffect(() => {
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
  }, []);

  function submit() {
    const value = command.trim();
    if (!value) return;
    setAnswer(replies[value.length % replies.length]);
    setCommand('');
  }

  return (
    <main className="bob-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <button className="brand" onClick={() => setActive(null)} aria-label="Ga naar BOB home"><span className="brand-mark"><Sparkles size={23} /></span><span>BOB</span></button>
        <div className="global-search"><Search size={20} /><span>Zoek in BOB of stel een vraag…</span><kbd>⌘ K</kbd></div>
        <nav className="top-actions" aria-label="Account"><button aria-label="Zoeken"><Search /></button><button aria-label="Instellingen"><Settings /></button><button className="avatar" aria-label="Profiel"><CircleUserRound /></button></nav>
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
