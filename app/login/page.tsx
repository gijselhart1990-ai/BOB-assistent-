'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Inloggen met een e-maillink.
 *
 * Geen wachtwoord om te lekken of te vergeten. En let op wat er níét gebeurt:
 * ook als je hier een geldige link krijgt, kom je nergens als je e-mailadres
 * niet op de toegangslijst staat. Dat is de tweede grendel, en die zit op de
 * server — niet in deze pagina.
 *
 * Deze pagina weet niets. Ze stuurt een adres naar /api/inloggen en toont wat
 * daar uitkomt; of een adres bestaat blijft daar geheim.
 */

const REDENEN: Record<string, string> = {
  config: 'De site mist nog BOB_SESSION_SECRET. Zie SETUP.md.',
  ongeldig: 'Die link is niet geldig meer.',
  gebruikt: 'Die link is al een keer gebruikt. Vraag een nieuwe aan.',
  'geen-code': 'Er zat geen inlogcode in de link.',
  'geen-toegang': 'Dit adres staat niet op de toegangslijst.',
};

function Formulier() {
  const params = useSearchParams();
  const verder = params.get('verder') || '/';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [toonCode, setToonCode] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ tekst: string; fout?: boolean } | null>(() => {
    const r = params.get('reden');
    return r && REDENEN[r] ? { tekst: REDENEN[r], fout: true } : null;
  });

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setMelding(null);
    try {
      const res = await fetch('/api/inloggen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: toonCode ? code : '', verder }),
      });
      const data = await res.json().catch(() => ({}));

      if (data?.ingelogd) { window.location.href = data.verder || '/'; return; }
      if (data?.ok) {
        setMelding({ tekst: 'Kijk in je mail. De link is tien minuten geldig en werkt één keer.' });
        return;
      }
      if (data?.codeMogelijk) setToonCode(true);
      setMelding({ tekst: data?.error || `Er ging iets mis (${res.status}).`, fout: true });
    } catch {
      setMelding({ tekst: 'De server is niet bereikbaar.', fout: true });
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={verstuur}>
        <span className="login-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 9.5 19 2.5 2.5 0 0 0 12 17" />
            <path d="M12 5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2A3 3 0 0 1 14.5 19 2.5 2.5 0 0 1 12 17" />
            <path d="M12 5v12" />
          </svg>
        </span>
        <h1>BOB</h1>
        <p>Dit dashboard is privé. Vul je e-mailadres in; staat het op de toegangslijst, dan krijg je een inloglink.</p>

        <input
          type="email" required autoFocus autoComplete="email"
          placeholder="jij@voorbeeld.nl"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />

        {toonCode && (
          <input
            type="password" autoComplete="one-time-code"
            placeholder="Inlogcode"
            value={code} onChange={(e) => setCode(e.target.value)}
          />
        )}

        <button className="btn-primary btn-wide" type="submit" disabled={bezig}>
          {bezig ? 'Bezig…' : toonCode ? 'Inloggen met code' : 'Stuur me een inloglink'}
        </button>

        {melding && <p className={`login-melding${melding.fout ? ' err' : ''}`}>{melding.tekst}</p>}

        {!toonCode && (
          <button type="button" className="login-schakel" onClick={() => setToonCode(true)}>
            Ik heb een inlogcode
          </button>
        )}

        <p className="login-voet">Geen link gekregen? Dan staat je adres niet op de lijst, of is de mail in spam beland.</p>
      </form>
    </div>
  );
}

export default function LoginPagina() {
  return <Suspense fallback={<div className="login-wrap" />}><Formulier /></Suspense>;
}
