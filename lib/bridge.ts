import { randomUUID } from 'node:crypto';
import { lees, schrijf, wis, sleutels } from '@/lib/blobs';

/**
 * De brug naar je laptop.
 *
 * Netlify draait in een datacenter en kan geen browservenster openen of
 * WhatsApp Web aansturen. Je laptop kan dat wel, maar is van buitenaf niet
 * bereikbaar: router, firewall, wisselend IP.
 *
 * Dus draait het verkeer om. De website zet een opdracht neer, je laptop
 * vraagt elke seconde of er werk is, voert het uit en schrijft het antwoord
 * terug. Geen open poort, niets te configureren op je router.
 *
 * Dit staat in Netlify Blobs en niet in Xano: een pollende laptop maakt zo
 * veel verzoeken dat Xano's gratis limiet (tien per twintig seconden) er
 * binnen een seconde doorheen is.
 */

const WACHTRIJ = 'bob-wachtrij';
const HARTSLAG = 'bob-hartslag';

export type JobSoort =
  | 'browser_status' | 'browser_goto' | 'browser_read' | 'browser_elements'
  | 'browser_click' | 'browser_type' | 'browser_press' | 'browser_screenshot' | 'browser_close'
  | 'whatsapp_panel' | 'whatsapp_status' | 'whatsapp_link' | 'whatsapp_qr';

/** Deze veranderen iets op een pagina en vragen dus eerst jouw akkoord. */
const VRAAGT_AKKOORD: JobSoort[] = ['browser_click', 'browser_type', 'browser_press'];

export const HEARTBEAT_MAX_MS = 60_000;

type Job = {
  id: string;
  gebruiker: string;
  soort: JobSoort;
  invoer: Record<string, unknown>;
  status: 'wacht' | 'bezig' | 'klaar' | 'fout' | 'verlopen';
  bevestigingNodig: boolean;
  bevestigd: boolean | null;
  resultaat?: unknown;
  fout?: string;
  aangemaakt: number;
  verlooptOp: number;
};

export type BrugStatus = {
  online: boolean;
  laatste: string | null;
  machine: string | null;
  versie: string | null;
  mogelijk: Record<string, boolean>;
};

const jobSleutel = (gebruiker: string, id: string) => `${slug(gebruiker)}/${id}`;
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

/* ---------------- hartslag ---------------- */

export async function brugStatus(gebruiker: string): Promise<BrugStatus> {
  const h = await lees<{ laatste: number; machine?: string; versie?: string; mogelijk?: Record<string, boolean> }>(
    HARTSLAG, slug(gebruiker),
  );
  if (!h) return { online: false, laatste: null, machine: null, versie: null, mogelijk: {} };
  return {
    online: Date.now() - h.laatste < HEARTBEAT_MAX_MS,
    laatste: new Date(h.laatste).toISOString(),
    machine: h.machine ?? null,
    versie: h.versie ?? null,
    mogelijk: h.mogelijk ?? {},
  };
}

export async function klopAan(gebruiker: string, info: { machine?: string; versie?: string; mogelijk?: Record<string, boolean> }) {
  await schrijf(HARTSLAG, slug(gebruiker), { laatste: Date.now(), ...info });
}

/* ---------------- opdrachten ---------------- */

export class BrugOffline extends Error {
  status = 503;
  constructor() {
    super('Je laptop is niet bereikbaar. Start BOB-bridge daar, of gebruik zolang de onderdelen die in de cloud werken.');
  }
}

export async function voerUitOpLaptop(
  gebruiker: string,
  soort: JobSoort,
  invoer: Record<string, unknown> = {},
  { wachtMs = 45_000 }: { wachtMs?: number } = {},
): Promise<{ ok: boolean; resultaat?: unknown; fout?: string; jobId: string }> {
  const status = await brugStatus(gebruiker);
  if (!status.online) throw new BrugOffline();

  const job: Job = {
    id: randomUUID(),
    gebruiker,
    soort,
    invoer,
    status: 'wacht',
    bevestigingNodig: VRAAGT_AKKOORD.includes(soort),
    bevestigd: null,
    aangemaakt: Date.now(),
    verlooptOp: Date.now() + wachtMs + 15_000,
  };
  await schrijf(WACHTRIJ, jobSleutel(gebruiker, job.id), job);

  const eind = Date.now() + wachtMs;
  while (Date.now() < eind) {
    await new Promise((r) => setTimeout(r, 700));
    const nu = await lees<Job>(WACHTRIJ, jobSleutel(gebruiker, job.id));
    if (!nu) continue;
    if (nu.status === 'klaar') {
      await wis(WACHTRIJ, jobSleutel(gebruiker, job.id));
      return { ok: true, resultaat: nu.resultaat, jobId: job.id };
    }
    if (nu.status === 'fout') {
      await wis(WACHTRIJ, jobSleutel(gebruiker, job.id));
      return { ok: false, fout: nu.fout ?? 'Onbekende fout op je laptop', jobId: job.id };
    }
  }

  await wis(WACHTRIJ, jobSleutel(gebruiker, job.id));
  return {
    ok: false,
    jobId: job.id,
    fout: 'Je laptop heeft niet op tijd geantwoord. Staat BOB-bridge daar nog te draaien?',
  };
}

/** Wat mag de laptop nu oppakken? Alleen dingen die geen akkoord nodig hebben, of al goedgekeurd zijn. */
export async function volgendeJob(gebruiker: string): Promise<{ id: string; soort: string; invoer: unknown } | null> {
  const alle = await sleutels(WACHTRIJ, `${slug(gebruiker)}/`);
  const jobs: Job[] = [];
  for (const k of alle) {
    const j = await lees<Job>(WACHTRIJ, k);
    if (j) jobs.push(j);
  }
  jobs.sort((a, b) => a.aangemaakt - b.aangemaakt);

  for (const j of jobs) {
    if (j.verlooptOp < Date.now()) { await wis(WACHTRIJ, jobSleutel(gebruiker, j.id)); continue; }
    if (j.status !== 'wacht') continue;
    if (j.bevestigingNodig && j.bevestigd !== true) continue;

    j.status = 'bezig';
    await schrijf(WACHTRIJ, jobSleutel(gebruiker, j.id), j);
    return { id: j.id, soort: j.soort, invoer: j.invoer };
  }
  return null;
}

export async function meldResultaat(gebruiker: string, id: string, ok: boolean, resultaat?: unknown, fout?: string) {
  const j = await lees<Job>(WACHTRIJ, jobSleutel(gebruiker, id));
  if (!j) throw Object.assign(new Error('Onbekende opdracht'), { status: 404 });
  j.status = ok ? 'klaar' : 'fout';
  j.resultaat = ok ? resultaat : undefined;
  j.fout = ok ? undefined : String(fout || 'Onbekende fout');
  await schrijf(WACHTRIJ, jobSleutel(gebruiker, id), j);
}

/* ---------------- toestemming ---------------- */

export async function openBevestiging(gebruiker: string) {
  const alle = await sleutels(WACHTRIJ, `${slug(gebruiker)}/`);
  const wachtend: Job[] = [];
  for (const k of alle) {
    const j = await lees<Job>(WACHTRIJ, k);
    if (j && j.status === 'wacht' && j.bevestigingNodig && j.bevestigd === null && j.verlooptOp > Date.now()) {
      wachtend.push(j);
    }
  }
  if (!wachtend.length) return null;
  wachtend.sort((a, b) => a.aangemaakt - b.aangemaakt);

  const j = wachtend[0];
  const inv = (j.invoer ?? {}) as Record<string, string>;
  const omschrijving =
    j.soort === 'browser_click' ? `Klikken op "${inv.element ?? '?'}"`
    : j.soort === 'browser_type' ? `"${(inv.text ?? '').slice(0, 60)}" typen in veld "${inv.field ?? '?'}"`
    : j.soort === 'browser_press' ? `Toets "${inv.key ?? '?'}" indrukken`
    : j.soort;

  return { id: j.id, soort: j.soort, omschrijving };
}

export async function beantwoordBevestiging(gebruiker: string, jobId: string, toegestaan: boolean) {
  const j = await lees<Job>(WACHTRIJ, jobSleutel(gebruiker, jobId));
  if (!j || j.status !== 'wacht') {
    throw Object.assign(new Error('Deze actie staat niet meer open'), { status: 409 });
  }
  if (toegestaan) {
    j.bevestigd = true;
  } else {
    j.bevestigd = false;
    j.status = 'klaar';
    j.resultaat = { uitgevoerd: false, reden: 'Je hebt dit niet toegestaan.' };
  }
  await schrijf(WACHTRIJ, jobSleutel(gebruiker, jobId), j);
  return { ok: true };
}
