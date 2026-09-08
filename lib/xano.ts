import { env } from '@/lib/env';

/**
 * Xano als database, meer niet.
 *
 * We gebruiken de Metadata API van Xano: daarmee kun je records lezen en
 * schrijven zonder in hun visuele editor endpoints te bouwen. Dat scheelt een
 * middag klikken, en belangrijker: er komt geen enkele Xano-URL in de browser.
 * Alle verkeer loopt server-side met een token dat alleen op de server staat.
 *
 * Wat dat betekent voor de beveiliging: Xano kent geen RLS zoals Postgres.
 * De grendel zit hier, in de code — elke aanroep hieronder gebeurt pas nadat
 * eisGebruiker() heeft vastgesteld wie je bent. Er is geen pad waarlangs de
 * browser Xano rechtstreeks kan bereiken.
 *
 * De hoogfrequente dingen (de wachtrij naar je laptop, de hartslag) staan
 * in Redis zodat regelmatig pollen deze database niet belast.
 */

export type XanoRecord = Record<string, unknown> & { id?: number | string };

function basis() {
  const { instance, token, workspace } = env.xano;
  if (!instance || !token || !workspace) {
    throw Object.assign(
      new Error('Xano is niet ingesteld — vul XANO_INSTANCE_URL, XANO_METADATA_TOKEN en XANO_WORKSPACE_ID in'),
      { status: 503 },
    );
  }
  return { url: `${instance}/api:meta/workspace/${workspace}`, token };
}

function tabelId(naam: keyof typeof env.xano.tabellen) {
  const id = env.xano.tabellen[naam];
  if (!id) {
    throw Object.assign(new Error(`Tabel-ID voor "${naam}" ontbreekt in de omgevingsvariabelen`), { status: 503 });
  }
  return id;
}

async function api(pad: string, init: RequestInit = {}) {
  const { url, token } = basis();
  const res = await fetch(`${url}${pad}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });

  const tekst = await res.text();
  let data: unknown = null;
  try { data = tekst ? JSON.parse(tekst) : null; } catch { /* geen JSON */ }

  if (!res.ok) {
    // Xano's foutmeldingen zijn kort; het pad erbij zetten scheelt zoeken.
    const melding = (data as { message?: string })?.message || tekst.slice(0, 200) || res.statusText;
    if (res.status === 429) {
      throw Object.assign(
        new Error('Xano geeft een snelheidslimiet terug. Op het gratis plan zijn dat tien verzoeken per twintig seconden.'),
        { status: 429 },
      );
    }
    throw Object.assign(new Error(`Xano ${res.status} op ${pad}: ${melding}`), { status: res.status });
  }
  return data;
}

/** Records zoeken. Xano's search-endpoint verwacht een lijst met voorwaarden. */
export async function zoek<T = XanoRecord>(
  tabel: keyof typeof env.xano.tabellen,
  waar: Record<string, string | number | boolean>,
  opties: { limiet?: number; sorteer?: { veld: string; richting?: 'asc' | 'desc' } } = {},
): Promise<T[]> {
  const search = Object.entries(waar).map(([veld, waarde]) => ({
    [veld]: { $eq: waarde },
  }));

  const body: Record<string, unknown> = {
    page: 1,
    per_page: opties.limiet ?? 50,
    ...(search.length ? { search } : {}),
    ...(opties.sorteer ? { sort: { [opties.sorteer.veld]: opties.sorteer.richting ?? 'desc' } } : {}),
  };

  const data = await api(`/table/${tabelId(tabel)}/content/search`, {
    method: 'POST',
    body: JSON.stringify(body),
  }) as { items?: T[] } | T[];

  return Array.isArray(data) ? data : (data?.items ?? []);
}

export async function eersteOfNull<T = XanoRecord>(
  tabel: keyof typeof env.xano.tabellen,
  waar: Record<string, string | number | boolean>,
): Promise<T | null> {
  const rijen = await zoek<T>(tabel, waar, { limiet: 1 });
  return rijen[0] ?? null;
}

export async function maak<T = XanoRecord>(
  tabel: keyof typeof env.xano.tabellen,
  velden: Record<string, unknown>,
): Promise<T> {
  return await api(`/table/${tabelId(tabel)}/content`, {
    method: 'POST',
    body: JSON.stringify(velden),
  }) as T;
}

/**
 * Bijwerken is bij Xano een PUT, en een PUT vervangt de rij. Stuur je alleen
 * het veld dat je wilt wijzigen, dan zijn de andere velden daarna leeg. Dat
 * is precies het soort fout dat je pas weken later merkt.
 *
 * Daarom geef je hier altijd de bestaande rij mee: alles wat je niet noemt
 * blijft dan staan. `werkVeldBij` haalt de bestaande rij eerst op als je die nog niet hebt.
 */
export async function werkBij<T = XanoRecord>(
  tabel: keyof typeof env.xano.tabellen,
  id: number | string,
  velden: Record<string, unknown>,
  bestaand: XanoRecord,
): Promise<T> {
  const volledig = { ...bestaand, ...velden };
  // De id hoort in het pad, niet in de body.
  const { id: _weg, ...body } = volledig as XanoRecord;
  return await api(`/table/${tabelId(tabel)}/content/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }) as T;
}

/** Eén veld wijzigen zonder de rest kwijt te raken. Twee verzoeken. */
export async function werkVeldBij<T = XanoRecord>(
  tabel: keyof typeof env.xano.tabellen,
  waar: Record<string, string | number | boolean>,
  velden: Record<string, unknown>,
): Promise<T | null> {
  const rij = await eersteOfNull<XanoRecord>(tabel, waar);
  if (!rij?.id) return null;
  return werkBij<T>(tabel, rij.id, velden, rij);
}

export async function verwijder(tabel: keyof typeof env.xano.tabellen, id: number | string) {
  await api(`/table/${tabelId(tabel)}/content/${id}`, { method: 'DELETE' });
}

/**
 * Bestaat de rij al? Dan bijwerken, anders aanmaken. Xano heeft geen upsert,
 * dus dat doen we hier — twee aanroepen in plaats van één, maar het scheelt
 * dubbele rijen die je later met de hand moet opruimen.
 */
export async function zetNeer<T = XanoRecord>(
  tabel: keyof typeof env.xano.tabellen,
  sleutel: Record<string, string | number | boolean>,
  velden: Record<string, unknown>,
): Promise<T> {
  const bestaand = await eersteOfNull<XanoRecord>(tabel, sleutel);
  return bestaand?.id
    ? werkBij<T>(tabel, bestaand.id, { ...sleutel, ...velden }, bestaand)
    : maak<T>(tabel, { ...sleutel, ...velden });
}

/** Voor de zelftest: haalt de tabellijst op zodat je ziet of alles klopt. */
export async function tabellen() {
  const data = await api('/table') as { items?: { id: number; name: string }[] } | { id: number; name: string }[];
  return Array.isArray(data) ? data : (data?.items ?? []);
}
