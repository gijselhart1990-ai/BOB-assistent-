'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ico, SchermKop, SchermVoet } from '@/components/ui';
import { haal } from '@/lib/client';
import { useBob } from '@/components/Shell';

/**
 * WhatsApp koppelen. Het koppelen zelf gebeurt op je laptop; deze pagina
 * toont de QR-code die daar wordt gegenereerd en houdt de status bij.
 */
export default function Koppelen() {
  const { toast, brugOnline } = useBob();
  const [status, setStatus] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [wacht, setWacht] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const ververs = useCallback(async () => {
    try {
      const s = await haal<any>('/api/whatsapp/status');
      setStatus(s);
      if (s.gekoppeld && s.boot === 'ready') { setWacht(false); setQr(null); stop(); return; }
      if (s.qr) {
        const q = await haal<any>('/api/whatsapp/qr');
        if (q.image) setQr(q.image);
      }
    } catch { /* volgende ronde weer */ }
  }, []);

  const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };

  useEffect(() => { ververs(); return stop; }, [ververs]);

  async function start() {
    setWacht(true);
    setQr(null);
    try {
      await haal('/api/whatsapp/link', { method: 'POST' });
      if (!timer.current) timer.current = setInterval(ververs, 2500);
    } catch (e) {
      setWacht(false);
      toast((e as Error).message, 'err');
    }
  }

  const gekoppeld = Boolean(status?.gekoppeld);

  return (
    <>
      <SchermKop kleur="#25d366" icoon={<Ico.wa />} titel="WhatsApp koppelen" onder="Eén keer scannen, daarna nooit meer."
        acties={<a className="btn-ghost" href="/whatsapp">Terug naar WhatsApp</a>} />

      {!brugOnline && (
        <div className="brug-balk">
          <span className="brug-stip" />
          Je laptop is offline. WhatsApp koppelen gebeurt dáár, dus start eerst <code>bob-bridge</code> op je laptop.
        </div>
      )}

      <div className="cols cols-link">
        <div className="card phone-card">
          <div className="phone">
            <div className="phone-top"><span>9:41</span><span className="phone-bars" /></div>
            <b className="phone-app">WhatsApp</b>
            <div className="phone-menu">
              <span>Nieuwe chat</span>
              <span className="on">Gekoppelde apparaten</span>
              <span>Berichten met ster</span>
              <span>Instellingen</span>
            </div>
          </div>
          <p className="handwritten">Open WhatsApp<br />en ga naar<br />Gekoppelde apparaten</p>
        </div>

        <div className="card qr-card">
          <header className="qr-head">
            <span className="view-icon" style={{ ['--c' as string]: '#25d366' } as React.CSSProperties}><Ico.wa /></span>
            <h2>WhatsApp koppelen</h2>
          </header>
          <p className="qr-sub">Scan de QR-code met WhatsApp op je telefoon en koppel je account met Bob.</p>

          <div className="qr-row">
            <div className="qr-box">
              {gekoppeld ? <p className="qr-wacht"><b>Gekoppeld.</b><br />Je WhatsApp staat in BOB.</p>
                : qr ? <img src={qr} alt="QR-code om te scannen" />
                : <p className="qr-wacht">{wacht ? 'Venster wordt geopend op je laptop…' : 'Nog niet gestart'}</p>}
            </div>
            <ol className="stappen">
              <li><span className="stap-n">1</span><div><b>Open WhatsApp op je telefoon</b><small>Ga naar Gekoppelde apparaten via het menu.</small></div></li>
              <li><span className="stap-n">2</span><div><b>Scan de QR-code</b><small>Richt je camera op deze code.</small></div></li>
              <li><span className="stap-n">3</span><div><b>Koppel dit apparaat</b><small>Je WhatsApp is daarna beschikbaar in Bob.</small></div></li>
            </ol>
          </div>

          <button className="btn-primary btn-wide" onClick={start} disabled={!brugOnline || wacht}>
            {wacht && <span className="qr-spin" />}
            {gekoppeld ? 'Opnieuw koppelen' : wacht ? 'Wacht op scan…' : 'Koppelen starten'}
          </button>
          <p className="qr-note">Lukt het niet? Draai <code>bob-bridge link-whatsapp</code> op je laptop.</p>
        </div>

        <aside className="bob-rail">
          <span className="rail-ghost" aria-hidden="true" />
          <header className="rail-head">
            <span className="rail-avatar"><Ico.vonk /></span>
            <div><b>Hallo! Ik ben Bob.</b><small>Ik help je met het koppelen.</small></div>
          </header>
          <p className="rail-tekst">Scan de code met je telefoon en je bent er zo. Daarna onthoud ik de sessie — dit hoeft maar één keer.</p>
          <div className="rail-checks">
            <Vink ico={<Ico.schild />} titel="Alleen lezen" onder="Bob verstuurt nooit berichten" waarde="✓" />
            <Vink ico={<Ico.scherm />} titel="Op je eigen laptop" onder="Berichten verlaten je machine niet" waarde={brugOnline ? '✓' : '–'} />
            <Vink ico={<Ico.bliksem />} titel="Status" onder={gekoppeld ? 'Gekoppeld' : 'Nog niet gekoppeld'} waarde={gekoppeld ? '✓' : '–'} />
          </div>
          <p className="handwritten right">Samen productiever<br />met Bob.</p>
        </aside>
      </div>

      <SchermVoet />
    </>
  );
}

function Vink({ ico, titel, onder, waarde }: { ico: React.ReactNode; titel: string; onder: string; waarde: string }) {
  return (
    <div className="check">
      <span className="check-ico">{ico}</span>
      <div><b>{titel}</b><small>{onder}</small></div>
      <i>{waarde}</i>
    </div>
  );
}
