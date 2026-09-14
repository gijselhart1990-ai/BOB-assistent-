import { createHash, randomUUID } from 'node:crypto';
import { opslagOmgeving } from './deployment';

type RecordWaarde<T> = { versie: string; waarde: T };
const CAS = `local old = redis.call('GET', KEYS[1])
if ARGV[1] == '' then
  if old then return 0 end
else
  if not old or cjson.decode(old).versie ~= ARGV[1] then return 0 end
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1`;

/** REST houdt de serverless app vrij van langlevende databaseverbindingen. */
async function commando<T>(args: (string | number)[]): Promise<T> {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw Object.assign(new Error('Redis-opslag ontbreekt. Koppel Upstash Redis via Vercel Storage.'), { status: 503 });
  try {
    const doel = new URL(url);
    if (doel.protocol !== 'https:' || doel.username || doel.password) throw new Error('Ongeldige Redis-URL');
    const res = await fetch(doel, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json() as { result: T; error?: string };
    if (!res.ok || data.error) throw new Error('Redis-verzoek mislukt');
    return data.result;
  } catch {
    throw Object.assign(new Error('De duurzame Redis-opslag is niet bereikbaar.'), { status: 503 });
  }
}
function basis(naam: string) {
  const omgeving = opslagOmgeving(process.env);
  const project = process.env.VERCEL_PROJECT_ID || process.env.BOB_STORAGE_PROJECT || 'bob';
  const scope = omgeving ? `preview-${createHash('sha256').update(omgeving).digest('hex').slice(0,16)}` : 'production';
  return `bob:${encodeURIComponent(project)}:${scope}:${encodeURIComponent(naam)}:`;
}
const key = (naam: string, sleutel: string) => basis(naam) + encodeURIComponent(sleutel);
// Alleen tijdelijke records: jobs, hartslag, inloglinks en pogingen.
const ttl = (naam: string) => naam === 'bob-hartslag' ? 300 : naam === 'bob-wachtrij' ? 3600 : 86400;
const serialiseer = (waarde: unknown) => JSON.stringify({ versie: randomUUID(), waarde });
async function record<T>(naam: string, sleutel: string): Promise<RecordWaarde<T> | null> {
  const raw = await commando<string | null>(['GET', key(naam, sleutel)]);
  return raw === null ? null : JSON.parse(raw) as RecordWaarde<T>;
}
export async function lees<T>(naam: string, sleutel: string): Promise<T | null> {
  return (await record<T>(naam, sleutel))?.waarde ?? null;
}
export async function schrijf(naam: string, sleutel: string, waarde: unknown): Promise<boolean> {
  return await commando(['SET', key(naam, sleutel), serialiseer(waarde), 'EX', ttl(naam)]) === 'OK';
}
export async function wis(naam: string, sleutel: string) {
  await commando(['DEL', key(naam, sleutel)]);
}
export async function sleutels(naam: string, prefix = ''): Promise<string[]> {
  const start = basis(naam);
  const gevonden = new Set<string>();
  let cursor = '0';
  do {
    const pagina = await commando<[string, string[]]>(['SCAN', cursor, 'MATCH', start + '*', 'COUNT', 100]);
    cursor = String(pagina[0]);
    for (const item of pagina[1]) {
      const sleutel = decodeURIComponent(item.slice(start.length));
      if (sleutel.startsWith(prefix)) gevonden.add(sleutel);
    }
  } while (cursor !== '0');
  return [...gevonden];
}
/** Redis voert vergelijken en schrijven als één atomaire operatie uit. */
export async function wijzig<T>(naam: string, sleutel: string, verander: (oud: T | null) => T | null): Promise<boolean> {
  const oud = await record<T>(naam, sleutel);
  const nieuw = verander(oud?.waarde ?? null);
  if (nieuw === null) return false;
  return await commando<number>(['EVAL', CAS, 1, key(naam, sleutel), oud?.versie ?? '', serialiseer(nieuw), ttl(naam)]) === 1;
}
export async function eersteKeer(tokenId: string): Promise<boolean> {
  return await commando(['SET', key('bob-inloglinks', tokenId), serialiseer({ op: Date.now() }), 'NX', 'EX', 86400]) === 'OK';
}
export async function teVaak(sleutel: string, max: number, vensterMs: number): Promise<boolean> {
  if (vensterMs > 86400_000 || vensterMs <= 0) throw new Error('Ongeldig venster voor inlogpogingen');
  for (let poging = 0; poging < 5; poging++) {
    let vol = false;
    const gelukt = await wijzig<{ tijden: number[] }>('bob-inlogpogingen', sleutel, oud => {
      const nu = Date.now();
      const recent = (oud?.tijden ?? []).filter(t => nu - t < vensterMs);
      if (recent.length >= max) { vol = true; return null; }
      return { tijden: [...recent, nu] };
    });
    if (vol) return true;
    if (gelukt) return false;
  }
  return true;
}
