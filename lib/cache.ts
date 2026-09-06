/**
 * Piepklein geheugencachetje. Serverless functions leven kort, dus dit helpt
 * alleen binnen één warme instantie — precies genoeg om te voorkomen dat één
 * paginabezoek vier keer dezelfde Google-aanroep doet.
 */
type Vak = { tot: number; waarde: unknown };
const vakjes = new Map<string, Vak>();

export async function cached<T>(sleutel: string, msGeldig: number, maak: () => Promise<T>): Promise<T> {
  const nu = Date.now();
  const bestaand = vakjes.get(sleutel);
  if (bestaand && bestaand.tot > nu) return bestaand.waarde as T;
  const waarde = await maak();
  vakjes.set(sleutel, { tot: nu + msGeldig, waarde });
  return waarde;
}

export function vergeet(prefix = '') {
  for (const k of vakjes.keys()) if (!prefix || k.startsWith(prefix)) vakjes.delete(k);
}
