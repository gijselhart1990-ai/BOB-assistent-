import { getStore, type Store } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { opslagOmgeving } from './deployment';

const winkels = new Map<string, Store>();
function winkel(naam: string): Store {
  const omgeving = opslagOmgeving(process.env);
  if (omgeving) naam = `preview-${createHash('sha256').update(omgeving).digest('hex').slice(0, 16)}-${naam}`;
  let store = winkels.get(naam);
  if (!store) {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN;
    store = getStore({ name: naam, consistency: 'strong', ...(siteID && token ? { siteID, token } : {}) });
    winkels.set(naam, store);
  }
  return store;
}
async function opslag<T>(actie: () => Promise<T>): Promise<T> {
  try { return await actie(); }
  catch { throw Object.assign(new Error('De duurzame opslag is niet bereikbaar. Controleer de Netlify Blobs-configuratie.'), { status: 503 }); }
}
/** Een ontbrekend record is null; een storing is nooit een leeg record. */
export async function lees<T>(naam: string, sleutel: string): Promise<T | null> {
  return opslag(() => winkel(naam).get(sleutel, { type: 'json', consistency: 'strong' }) as Promise<T | null>);
}
export async function schrijf(naam: string, sleutel: string, waarde: unknown): Promise<boolean> {
  return opslag(async () => (await winkel(naam).setJSON(sleutel, waarde)).modified);
}
export async function wis(naam: string, sleutel: string) {
  return opslag(() => winkel(naam).delete(sleutel));
}
export async function sleutels(naam: string, prefix = ''): Promise<string[]> {
  return opslag(async () => {
    const keys: string[] = [];
    for await (const page of winkel(naam).list({ prefix, paginate: true })) keys.push(...page.blobs.map(blob => blob.key));
    return keys;
  });
}
/** ETag voorkomt dat gelijktijdige verzoeken elkaars wijzigingen overschrijven. */
export async function wijzig<T>(naam: string, sleutel: string, verander: (oud: T | null) => T | null): Promise<boolean> {
  return opslag(async () => {
    const store = winkel(naam);
    const oud = await store.getWithMetadata(sleutel, { type: 'json', consistency: 'strong' });
    const nieuw = verander(oud?.data ?? null);
    if (nieuw === null) return false;
    if (oud && !oud.etag) throw new Error('Opslag gaf geen versie terug.');
    return (await store.setJSON(sleutel, nieuw, oud ? { onlyIfMatch: oud.etag! } : { onlyIfNew: true })).modified;
  });
}
/** Een link werkt eenmaal, ook wanneer twee callbacks tegelijk binnenkomen. */
export async function eersteKeer(tokenId: string): Promise<boolean> {
  return opslag(async () => (await winkel('bob-inloglinks').setJSON(tokenId, { op: Date.now() }, { onlyIfNew: true })).modified);
}
export async function teVaak(sleutel: string, max: number, vensterMs: number): Promise<boolean> {
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
