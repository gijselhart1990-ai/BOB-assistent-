'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Ico, SchermKop, SchermVoet, KaartKop, Skelet } from '@/components/ui';
import { useApi } from '@/components/hooks';
import { haal } from '@/lib/client';
import { useBob } from '@/components/Shell';

function Inhoud() {
  const params = useSearchParams();
  const melding = params.get('melding');
  const { toast } = useBob();
  const status = useApi<any>('/api/status');
  const tokens = useApi<any>('/api/bridge/token');
  const [nieuwToken, setNieuwToken] = useState<string | null>(null);

  const caps = status.data?.capabilities ?? {};
  const brug = status.data?.brug ?? { online: false };

  async function maakToken() {
    try {
      const r = await haal<any>('/api/bridge/token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam: 'Laptop' }),
      });
      setNieuwToken(r.token);
      tokens.opnieuw();
    } catch (e) { toast((e as Error).message, 'err'); }
  }

  return (
    <>
      <SchermKop kleur="#14724f" icoon={<Ico.tandwiel />} titel="Instellingen" onder="Koppelingen, sleutels en je laptop."
        acties={<form action="/api/uitloggen" method="post"><button className="btn-ghost" type="submit">Uitloggen</button></form>} />

      {melding && <div className="brug-balk online"><span className="brug-stip" />{melding}</div>}

      <div className="cols cols-social">
        <div className="card">
          <KaartKop kleur="#0d5138" icoon={<Ico.koppel />} titel="Koppelingen" onder="Wat is er verbonden" />
          <div className="card-body">
            {status.bezig ? <Skelet /> : (
              <>
                <Regel titel="Google (Agenda + Gmail)"
                  aan={Boolean(status.data?.gekoppeld?.google)}
                  klaar={Boolean(caps.google)}
                  href="/api/oauth/google/start"
                  uitleg="Leesrechten op je agenda en ongelezen mail. Meer niet." />
                <Regel titel="Microsoft (Outlook)"
                  aan={Boolean(status.data?.gekoppeld?.microsoft)}
                  klaar={Boolean(caps.microsoft)}
                  href="/api/oauth/microsoft/start"
                  uitleg="Alleen de client-ID is verplicht; een secret is optioneel." />
                <Regel titel="Todoist" aan={Boolean(caps.todoist)} klaar={Boolean(caps.todoist)}
                  uitleg="Werkt via een API-token in de omgevingsvariabelen." />
                <Regel titel="Claude (het brein)" aan={Boolean(caps.brein)} klaar={Boolean(caps.brein)}
                  uitleg="Zonder sleutel toont BOB je data, maar beantwoordt hij geen vragen." />
                <Regel titel="Brave (zoeken)" aan={Boolean(caps.web)} klaar={Boolean(caps.web)}
                  uitleg="Zonder sleutel kan BOB nog wel pagina’s lezen die je zelf noemt." />
                <Regel titel="Cartesia (stem)" aan={Boolean(caps.stem)} klaar={Boolean(caps.stem)}
                  uitleg="Spraak in en uit, met je eigen stem." />
              </>
            )}
            <p className="rail-tekst" style={{ marginTop: 14 }}>
              Sleutels staan als omgevingsvariabelen bij Vercel, nooit in de code en nooit in je browser.
              Wijzigen doe je daar; daarna een nieuwe deploy.
            </p>
          </div>
        </div>

        <div className="card">
          <KaartKop kleur="#1a9464" icoon={<Ico.scherm />} titel="Je laptop" onder="Voor browseracties en WhatsApp"
            rechts={<span className={`pill${brug.online ? '' : ' muted'}`}>{brug.online ? 'online' : 'offline'}</span>} />
          <div className="card-body">
            <p className="rail-tekst">
              Vercel draait in een datacenter en kan geen browservenster openen of WhatsApp Web aansturen.
              Je laptop kan dat wel. Het bridge-programma daar vraagt elke seconde of er werk voor hem is —
              alleen uitgaand verkeer, geen open poort op je router.
            </p>

            {brug.online ? (
              <div className="brug-balk online" style={{ margin: '14px 0 0' }}>
                <span className="brug-stip" />
                Verbonden met <b>&nbsp;{brug.machine || 'je laptop'}</b>&nbsp;· laatste teken van leven{' '}
                {brug.laatste ? new Date(brug.laatste).toLocaleTimeString('nl-NL') : '—'}
              </div>
            ) : (
              <div className="brug-balk" style={{ margin: '14px 0 0' }}>
                <span className="brug-stip" />
                Geen laptop verbonden. Start <code>bob-bridge</code> daar.
              </div>
            )}

            <div className="read-actions" style={{ marginTop: 16, borderTop: 0, paddingTop: 0 }}>
              <button className="btn-primary" onClick={maakToken}>Nieuw bridge-token maken</button>
            </div>

            {nieuwToken && (
              <div className="note-card" style={{ marginTop: 14 }}>
                <b>Kopieer dit nu — je ziet hem maar één keer.</b>
                <code style={{ display: 'block', wordBreak: 'break-all', marginTop: 6 }}>{nieuwToken}</code>
                Zet hem op je laptop in <code>bridge/.env</code> als <code>BOB_BRIDGE_TOKEN</code>.
                In de database staat alleen een hash, dus ook ik kan hem daarna niet meer teruglezen.
              </div>
            )}

            {tokens.data?.tokens?.length ? (
              <div style={{ marginTop: 14 }}>
                {tokens.data.tokens.map((t: any) => (
                  <div className="wa-row" key={t.created_at}>
                    <span className="wa-dot" />
                    <span className="wa-naam">{t.naam}</span>
                    <span className="item-tijd">
                      {t.laatst_gebruikt ? `gebruikt ${new Date(t.laatst_gebruikt).toLocaleDateString('nl-NL')}` : 'nog niet gebruikt'}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <SchermVoet />
    </>
  );
}

function Regel({ titel, aan, klaar, href, uitleg }: {
  titel: string; aan: boolean; klaar: boolean; href?: string; uitleg: string;
}) {
  return (
    <div className="check" style={{ marginBottom: 8 }}>
      <span className="check-ico">{aan ? <Ico.schild /> : <Ico.koppel />}</span>
      <div><b>{titel}</b><small>{uitleg}</small></div>
      {aan ? <i>✓</i> : href && klaar
        ? <a className="btn-ghost btn-sm" href={href}>Koppelen</a>
        : <i>–</i>}
    </div>
  );
}

export default function Instellingen() {
  return <Suspense fallback={<Skelet />}><Inhoud /></Suspense>;
}
