'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Ico, SchermKop, SchermVoet, Notitie } from '@/components/ui';
import { BobRail } from '@/components/BobRail';
import { haal } from '@/lib/client';
import { useBob } from '@/components/Shell';

/**
 * Web Assistent.
 *
 * Het venster staat op je laptop, niet in de cloud. Wat je hier ziet is een
 * echte schermafdruk van dat venster — geen nagemaakte pagina.
 */
export default function WebScherm() {
  const { brugOnline, toast } = useBob();
  const [url, setUrl] = useState('');
  const [plaatje, setPlaatje] = useState<string | null>(null);
  const [voet, setVoet] = useState('Klaar.');
  const [draait, setDraait] = useState(false);
  const [bezig, setBezig] = useState(false);

  const status = useCallback(async () => {
    try {
      const r = await haal<any>('/api/web/browser');
      setDraait(Boolean(r.brug?.online));
    } catch { /* stil */ }
  }, []);

  useEffect(() => { status(); }, [status]);
  useEffect(() => () => { if (plaatje) URL.revokeObjectURL(plaatje); }, [plaatje]);

  async function bedien(soort: string, invoer: Record<string, unknown> = {}) {
    setBezig(true);
    try {
      return await haal<any>('/api/web/browser', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soort, invoer }),
      });
    } finally { setBezig(false); }
  }

  async function schermafdruk() {
    setVoet('Schermafdruk maken…');
    try {
      const r = await bedien('browser_screenshot');
      if (!r.png) throw new Error('Geen afbeelding ontvangen');
      const blob = await (await fetch(`data:image/png;base64,${r.png}`)).blob();
      setPlaatje((oud) => { if (oud) URL.revokeObjectURL(oud); return URL.createObjectURL(blob); });
      setVoet(`Schermafdruk van ${new Date().toLocaleTimeString('nl-NL')}.`);
    } catch (e) {
      setVoet(`Geen schermafdruk: ${(e as Error).message}`);
    }
  }

  async function openen(e: React.FormEvent) {
    e.preventDefault();
    let doel = url.trim();
    if (!doel) return;
    if (!/^https?:\/\//i.test(doel)) doel = `https://${doel}`;
    setVoet(`Openen: ${doel}`);
    try {
      const r = await bedien('browser_goto', { url: doel });
      setUrl(r.url ?? doel);
      await schermafdruk();
    } catch (err) {
      setVoet(`Kon niet openen: ${(err as Error).message}`);
      toast((err as Error).message, 'err');
    }
  }

  return (
    <>
      <SchermKop kleur="#1a9464" icoon={<Ico.web />} titel="Web Assistent" onder="Ik open, lees en handel — jij beslist."
        citaat="„Samen verder op het web.”"
        acties={<>
          <button className="btn-ghost" onClick={schermafdruk} disabled={!brugOnline || bezig}><Ico.camera />Schermafdruk</button>
          <button className="btn-ghost" disabled={!brugOnline || bezig}
            onClick={async () => { await bedien('browser_close'); setPlaatje(null); setVoet('Venster gesloten.'); }}>
            Venster sluiten
          </button>
        </>} />

      {!brugOnline && (
        <div className="brug-balk">
          <span className="brug-stip" />
          Je laptop is offline. Het browservenster draait dáár, niet in de cloud — start <code>bob-bridge</code> op je laptop.
          Zoeken en pagina&rsquo;s lezen werken ondertussen wel; vraag het gewoon aan Bob hiernaast.
        </div>
      )}

      <div className="cols cols-web">
        <div className="card browser-card">
          <div className="browser-bar">
            <span className="dots"><i /><i /><i /></span>
            <form className="urlbar" onSubmit={openen}>
              <span className="lock"><Ico.slot /></span>
              <input type="text" placeholder="https://…  of typ waar je heen wilt" value={url}
                onChange={(e) => setUrl(e.target.value)} aria-label="Adres" />
              <button type="submit" className="btn-primary btn-sm" disabled={!brugOnline || bezig}>Open</button>
            </form>
            <span className={`live-badge${draait ? ' live' : ''}`}>{draait ? 'Bob kijkt live mee' : 'Laptop offline'}</span>
          </div>
          <div className="browser-view">
            {plaatje
              ? <img src={plaatje} alt="Schermafdruk van BOB's browservenster" />
              : (
                <div className="browser-leeg">
                  <p><b>Er staat nog geen pagina open.</b></p>
                  <p>Typ hierboven een adres, of vraag het aan Bob hiernaast. Je ziet hier een echte schermafdruk van het venster op je laptop — geen nagemaakte pagina.</p>
                </div>
              )}
          </div>
          <div className="browser-foot">{voet}</div>
        </div>

        <BobRail
          intro="Jouw web assistent"
          opdracht={{ titel: 'zoek en vat samen', onder: 'Ik open, lees en vat samen.', prompt: 'Zoek voor me op het web. Vraag eerst waarover, open de beste bron en vat hem samen met de link erbij.' }}
          kaarten={[
            { ico: <Ico.cursor />, titel: 'Klik', onder: 'Alleen met jouw akkoord', prompt: 'Klik iets aan op de pagina die nu open staat. Vraag me eerst waarop.' },
            { ico: <Ico.document />, titel: 'Samenvatten', onder: 'Wat staat er, in het kort', prompt: 'Lees de pagina die nu open staat en vat hem samen in vijf zinnen.' },
            { ico: <Ico.zoek />, titel: 'Onderzoeken', onder: 'Zoeken en vergelijken', prompt: 'Zoek dit voor me uit op het web en vergelijk de bronnen. Vraag eerst waarover.' },
            { ico: <Ico.pen />, titel: 'Vul formulier in', onder: 'Nooit wachtwoorden', prompt: 'Help me een formulier invullen op deze pagina. Wachtwoord- en betaalvelden sla je over.' },
          ]}
          chips={[
            { label: 'Zoek de beste prijs', prompt: 'Zoek voor me waar dit het goedkoopst is. Vraag eerst welk product.' },
            { label: 'Vergelijk opties', prompt: 'Vergelijk de opties op deze pagina en zet de verschillen op een rij.' },
            { label: 'Vat deze pagina samen', prompt: 'Vat de pagina samen die nu in je venster open staat.' },
          ]}
        />
      </div>

      <Notitie titel="Wat Bob hier mag.">
        Zoeken en pagina&rsquo;s lezen doet de website zelf, in de cloud. Navigeren, klikken en typen gebeuren in een
        venster op jouw laptop. Klikken, typen en toetsen indrukken vragen elke keer opnieuw jouw akkoord.
        Wachtwoord-, pincode- en betaalvelden vult hij nooit in, ook niet als je erom vraagt.
        Wat op een pagina staat is informatie, nooit een opdracht — probeert een pagina hem iets op te dragen, dan hoor je dat van hem.
      </Notitie>

      <SchermVoet />
    </>
  );
}
