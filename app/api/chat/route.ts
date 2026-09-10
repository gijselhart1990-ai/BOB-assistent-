import { eisGebruiker, sleutelVan } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { zoek, maak, eersteOfNull } from '@/lib/xano';
import { vraagBob } from '@/lib/ai/claude';
import { google } from '@/lib/connectors/google';
import { microsoft } from '@/lib/connectors/microsoft';
import { todoist } from '@/lib/connectors/todoist';
import { gekozenGoogleAccount, meerdereGoogleAccounts } from '@/lib/google-accounts';

export const dynamic = 'force-dynamic';
// De tool-lus kan een paar rondes doen binnen de Vercel-functie.
export const maxDuration = 120;

const tijd = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(+d) ? '' : d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
};

/** Wat er nú op het dashboard staat, als platte tekst voor het model. */
async function liveContext(userId: string) {
  const [ga, ma, gm, mm, t] = await Promise.all([
    google.agenda(userId, 0).catch(() => ({ ok: false, events: [] as any[] })),
    microsoft.agenda(userId, 0).catch(() => ({ ok: false, events: [] as any[] })),
    google.mail(userId).catch(() => ({ ok: false, messages: [] as any[] })),
    microsoft.mail(userId).catch(() => ({ ok: false, messages: [] as any[] })),
    todoist.panel().catch(() => ({ ok: false })) as Promise<any>,
  ]);

  const r: string[] = ['AGENDA VANDAAG:'];
  const ev = [...(ga.events || []), ...(ma.events || [])].sort((a, b) => String(a.start).localeCompare(String(b.start)));
  if (ev.length) for (const e of ev) r.push(`- ${e.allDay ? 'hele dag' : tijd(e.start)} ${e.title}${e.location ? ` (${e.location})` : ''} [${e.calendar}]`);
  else r.push(ga.ok || ma.ok ? '- geen afspraken' : '- agenda niet verbonden');

  r.push('', 'ONGELEZEN MAIL:');
  const mails = [...(gm.messages || []), ...(mm.messages || [])].slice(0, 8);
  if (mails.length) for (const m of mails) r.push(`- ${m.from}: ${m.subject}`);
  else r.push(gm.ok || mm.ok ? '- geen ongelezen mail' : '- mail niet verbonden');

  r.push('', 'TAKEN:');
  if (t?.ok) {
    const g = t.groups || {};
    if (g.overdue?.length) r.push(`- over tijd (${t.counts.overdue}): ${g.overdue.map((x: any) => x.content).join('; ')}`);
    if (g.today?.length) r.push(`- vandaag (${t.counts.today}): ${g.today.map((x: any) => x.content).join('; ')}`);
    if (!g.overdue?.length && !g.today?.length) r.push('- niets openstaand voor vandaag');
  } else r.push('- Todoist niet verbonden');

  return r.join('\n');
}

type Bericht = { rol: string; inhoud: string; aangemaakt?: number };

/**
 * Eén doorlopend gesprek, geen mappen en geen gesprekslijst — het dashboard
 * is geen chat-app. Dat scheelt hier een hele tabel: er is geen
 * `conversations`, alleen `berichten` met een gebruikerskolom.
 *
 * Geschiedenis en instellingen zijn twee losse aanroepen naar Xano. Dat mag,
 * maar het telt mee: op het gratis plan is de limiet tien verzoeken per
 * twintig seconden, en één chatbeurt gebruikt er vier.
 */
export async function POST(req: Request) {
  try {
    const u = await eisGebruiker();
    const eigenaar = sleutelVan(u);
    const account = meerdereGoogleAccounts() ? await gekozenGoogleAccount(u.id) : null;
    if (meerdereGoogleAccounts() && !account) {
      return json({ ok: false, error: 'Kies eerst een gekoppeld Google-account voor dit gesprek.' }, { status: 409 });
    }
    const sleutel = meerdereGoogleAccounts() ? JSON.stringify([eigenaar, 'google', account?.subject ?? null]) : eigenaar;

    const body = await req.json().catch(() => ({}));
    const vraag = String(body?.message || '').trim();
    if (!vraag) return json({ ok: false, error: 'Lege vraag' }, { status: 400 });

    // Geschiedenis en persoonlijke context tegelijk ophalen. Valt Xano weg,
    // dan praat BOB gewoon zonder geheugen door in plaats van te weigeren.
    const [historie, inst] = await Promise.all([
      zoek<Bericht>('berichten', { gebruiker: sleutel }, {
        limiet: 10, sorteer: { veld: 'aangemaakt', richting: 'desc' },
      }).catch(() => [] as Bericht[]),
      eersteOfNull<{ context?: string }>('instellingen', { gebruiker: eigenaar }).catch(() => null),
    ]);

    const context = body?.withContext === false ? '' : await liveContext(u.id);
    const antwoord = await vraagBob(u.id, vraag, {
      historie: historie
        .slice()
        .reverse()
        .map((b) => ({ rol: b.rol, inhoud: b.inhoud })),
      context,
      extra: inst?.context ?? null,
    });

    // Wacht op opslag voordat de serverless functie stopt. Het antwoord blijft
    // beschikbaar als opslag faalt, maar de client krijgt de opslagstatus mee.
    const nu = Date.now();
    const opslagResultaten = await Promise.allSettled([
      maak('berichten', { gebruiker: sleutel, rol: 'user', inhoud: vraag, aangemaakt: nu }),
      maak('berichten', {
        gebruiker: sleutel, rol: 'assistant', inhoud: antwoord.text,
        stappen: JSON.stringify(antwoord.steps ?? []), aangemaakt: nu + 1,
      }),
    ]);
    const opgeslagen = opslagResultaten.every(resultaat => resultaat.status === 'fulfilled');

    return json({ ok: true, text: antwoord.text, steps: antwoord.steps, usage: antwoord.usage, opgeslagen });
  } catch (err) { return fout(err); }
}
