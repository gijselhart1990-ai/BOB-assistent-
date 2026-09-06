import { createHash } from 'node:crypto';
import { eersteOfNull, werkBij, type XanoRecord } from '@/lib/xano';

/**
 * Het bridge-programma op je laptop logt niet in met een e-maillink; het
 * krijgt een eigen token. Daarvan bewaren we alleen de hash — precies zoals
 * je met een wachtwoord doet. Lekt de database, dan lekt het token niet.
 */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export class GeenBrugToken extends Error {
  status = 401;
  constructor(msg = 'Ongeldig of ontbrekend bridge-token') { super(msg); }
}

export async function gebruikerVanBrugToken(req: Request): Promise<string> {
  const kop = req.headers.get('authorization') || '';
  const token = kop.startsWith('Bearer ') ? kop.slice(7).trim() : '';
  if (!token) throw new GeenBrugToken();

  const rij = await eersteOfNull<XanoRecord & { id: number; gebruiker: string }>('bridge_tokens', {
    token_hash: hashToken(token),
  });
  if (!rij) throw new GeenBrugToken();

  // Bijhouden wanneer hij voor het laatst gebruikt is; handig als je ooit wilt
  // zien of er nog een oud token rondslingert. De hele rij gaat mee, want een
  // PUT bij Xano vervangt hem — anders wist deze regel de hash.
  // Mislukt het, dan is dat geen reden om de opdracht te weigeren.
  werkBij('bridge_tokens', rij.id, { laatst_gebruikt: new Date().toISOString() }, rij).catch(() => {});

  return rij.gebruiker;
}
