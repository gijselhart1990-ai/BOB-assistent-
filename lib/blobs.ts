import { getStore, type Store } from '@netlify/blobs';

/**
 * De snelle opslag: de wachtrij naar je laptop, de hartslag, en de lijst met
 * al gebruikte inloglinks.
 *
 * Waarom niet in Xano: het gratis plan daar staat tien verzoeken per twintig
 * seconden toe. Je laptop vraagt elke seconde of er werk is — dat past er
 * niet in. Netlify Blobs hoort bij je Netlify-site, kent die limiet niet en
 * kost niets extra.
 *
 * Let op de consistentie. Blobs staat standaard op "eventual": een schrijf-
 * actie is pas na maximaal een minuut overal zichtbaar. Voor een wachtrij is
 * dat onbruikbaar — je laptop zou opdrachten pas een minuut later zien, of
 * twee keer uitvoeren. Daarom overal expliciet 'strong'.
 *
 * En buiten Netlify bestaat deze opslag helemaal niet: draai je `next dev` op
 * je laptop, dan is er geen site om een store aan te hangen. Dat mag geen 500
 * opleveren op een pagina die er verder niets mee te maken heeft, dus lezen
 * en schrijven falen hier zacht. Eén uitzondering staat onderaan.
 */

const winkels = new Map<string, Store>();

function winkel(naam: string): Store {
  let s = winkels.get(naam);
  if (!s) {
    s = getStore({ name: naam, consistency: 'strong' });
    winkels.set(naam, s);
  }
  return s;
}

/** Draaien we ergens waar Blobs hoort te werken? */
const inDeCloud = () => Boolean(process.env.NETLIFY || process.env.NETLIFY_LOCAL);

let gewaarschuwd = false;
function waarschuw(actie: string, err: unknown) {
  if (gewaarschuwd) return;
  gewaarschuwd = true;
  console.warn(
    `[blobs] ${actie} werkt hier niet (${(err as Error)?.message ?? err}). ` +
    'Buiten Netlify is dat normaal: de wachtrij naar je laptop en de controle ' +
    'op gebruikte inloglinks doen het lokaal niet.',
  );
}

export async function lees<T>(naam: string, sleutel: string): Promise<T | null> {
  try {
    return await winkel(naam).get(sleutel, { type: 'json', consistency: 'strong' }) as T | null;
  } catch (err) {
    waarschuw('lezen', err);
    return null;
  }
}

/** Geeft false als er niet geschreven kon worden. Wie dat erg vindt, kijkt. */
export async function schrijf(naam: string, sleutel: string, waarde: unknown): Promise<boolean> {
  try {
    await winkel(naam).setJSON(sleutel, waarde as object);
    return true;
  } catch (err) {
    waarschuw('schrijven', err);
    return false;
  }
}

export async function wis(naam: string, sleutel: string) {
  try { await winkel(naam).delete(sleutel); } catch { /* was er al niet */ }
}

export async function sleutels(naam: string, prefix = ''): Promise<string[]> {
  try {
    const { blobs } = await winkel(naam).list({ prefix });
    return blobs.map((b) => b.key);
  } catch {
    return [];
  }
}

/* ---------------- gebruikte inloglinks ---------------- */

const GEBRUIKT = 'bob-inloglinks';

/**
 * Geeft true als deze link nog niet eerder gebruikt is, en markeert hem
 * meteen. Zonder dit blijft een link in je mailbox tien minuten lang
 * herbruikbaar door iedereen die hem in handen krijgt.
 *
 * Dit is de uitzondering op "zacht falen". Kunnen we niet opschrijven dát een
 * link gebruikt is, dan kunnen we ook niet beloven dat hij maar één keer
 * werkt. In de cloud weigeren we dan liever de toegang dan die belofte stil
 * te breken. Op je eigen laptop, waar geen Blobs bestaat en niemand anders
 * bij je mail kan, zou datzelfde alleen betekenen dat je niet meer kunt
 * inloggen — daar laten we hem door, met een waarschuwing in de console.
 */
export async function eersteKeer(tokenId: string): Promise<boolean> {
  const bestaand = await lees<{ op: number }>(GEBRUIKT, tokenId);
  if (bestaand) return false;

  if (await schrijf(GEBRUIKT, tokenId, { op: Date.now() })) return true;

  if (inDeCloud()) {
    throw Object.assign(
      new Error('De opslag voor inloglinks is even niet bereikbaar, dus kan niet worden gecontroleerd of deze link al gebruikt is. Probeer het zo nog eens.'),
      { status: 503 },
    );
  }
  return true;
}

/**
 * Een simpele rem op het aanvragen van inloglinks. Lukt het bijhouden niet,
 * dan remmen we niet: een kapotte teller mag nooit de voordeur dichtgooien.
 */
export async function teVaak(sleutel: string, max: number, vensterMs: number): Promise<boolean> {
  const nu = Date.now();
  const oud = (await lees<{ tijden: number[] }>('bob-inlogpogingen', sleutel))?.tijden ?? [];
  const recent = oud.filter((t) => nu - t < vensterMs);
  if (recent.length >= max) return true;
  await schrijf('bob-inlogpogingen', sleutel, { tijden: [...recent, nu] });
  return false;
}
