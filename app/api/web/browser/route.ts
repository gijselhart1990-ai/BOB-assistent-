import { eisGebruiker } from '@/lib/auth';
import { json, fout } from '@/lib/http';
import { voerUitOpLaptop, brugStatus, type JobSoort } from '@/lib/bridge';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TOEGESTAAN: JobSoort[] = [
  'browser_status', 'browser_goto', 'browser_read', 'browser_elements',
  'browser_screenshot', 'browser_close',
];

export async function GET() {
  try {
    const u = await eisGebruiker();
    return json({ ok: true, brug: await brugStatus(u.id) });
  } catch (err) { return fout(err); }
}

export async function POST(req: Request) {
  try {
    const u = await eisGebruiker();
    const { soort, invoer } = await req.json().catch(() => ({}));
    if (!TOEGESTAAN.includes(soort)) {
      // Klikken en typen lopen bewust via de chat, waar de bevestiging en de
      // uitleg bij elkaar staan. Een kale knop in het dashboard die zonder
      // context iets aanklikt is precies wat we niet willen.
      return json({ ok: false, error: `Onbekende of niet-toegestane opdracht: ${soort}` }, { status: 400 });
    }
    const r = await voerUitOpLaptop(u.id, soort, invoer || {});
    return json(r.ok ? { ok: true, ...(r.resultaat as object) } : { ok: false, error: r.fout }, { status: r.ok ? 200 : 503 });
  } catch (err) { return fout(err); }
}
