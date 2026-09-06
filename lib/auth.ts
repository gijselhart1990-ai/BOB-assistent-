import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { cookieNaam, leesSessie } from '@/lib/session';

/**
 * `id` is hier gewoon het e-mailadres. Er is één gebruiker en er bestaat geen
 * aparte gebruikerstabel meer; het adres is de sleutel waaronder alles in
 * Xano staat.
 */
export type Gebruiker = { email: string; id: string };

/**
 * Twee horden, niet één.
 *
 * 1. Heb je een geldig, ondertekend sessiecookie?
 * 2. Staat je adres op de toegangslijst?
 *
 * Die tweede lijkt overbodig zolang alleen jij een link kunt krijgen, maar
 * hij is er voor het moment waarop dat niet meer klopt: een oud cookie, een
 * verkeerd gezette omgevingsvariabele, of een mailer die naar het verkeerde
 * adres stuurt. Toegang intrekken is dan één variabele wijzigen.
 */
export function staatOpLijst(email: string) {
  if (!env.toegestaan.length) return false;
  return env.toegestaan.includes(email.trim().toLowerCase());
}

export async function huidigeGebruiker(): Promise<Gebruiker | null> {
  const jar = await cookies();
  const email = leesSessie(jar.get(cookieNaam)?.value);
  if (!email || !staatOpLijst(email)) return null;
  const laag = email.toLowerCase();
  return { email: laag, id: laag };
}

export class NietToegestaan extends Error {
  status = 401;
  constructor(msg = 'Niet ingelogd of niet op de toegangslijst') { super(msg); }
}

export async function eisGebruiker(): Promise<Gebruiker> {
  const g = await huidigeGebruiker();
  if (!g) throw new NietToegestaan();
  return g;
}

/**
 * Sleutel waaronder de gegevens van deze gebruiker in Xano staan. Eén
 * gebruiker, maar de tabellen hebben er toch een kolom voor: dat scheelt een
 * migratie als er ooit een tweede bijkomt, en het maakt een verdwaalde rij
 * meteen zichtbaar.
 */
export const sleutelVan = (g: Gebruiker) => g.email.toLowerCase();
