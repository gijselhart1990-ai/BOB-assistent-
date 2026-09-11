/**
 * Toegang, getest.
 *
 *   npm test
 *
 * De laatste twee zijn de belangrijkste. De middleware draait op Netlify's
 * edge, waar node:crypto niet bestaat, dus daar staat een tweede implementatie
 * van dezelfde handtekening — met Web Crypto. Lopen die twee ooit uit elkaar,
 * dan kom je met een geldig cookie niet meer binnen, of — erger — juist wel
 * met een ongeldig. Daarom worden ze hier tegen elkaar aan gehouden.
 */

// Vóór de import, want lib/env leest de omgeving bij het laden. Niet in het
// npm-script zetten: `VAR=waarde commando` werkt niet op Windows.
process.env.BOB_SESSION_SECRET ||= 'alleen-voor-de-test-en-minstens-32-tekens-lang';

const uit: string[] = [];
let mislukt = false;
const ok = (naam: string, waar: boolean) => {
  uit.push(`${waar ? '  [v]' : '  [X]'} ${naam}`);
  if (!waar) mislukt = true;
};

import { sessieGeldig as middlewareLeest } from '../middleware';

async function main() {
  const { maakSessie, leesSessie, maakInlogToken, leesInlogToken, tekenState, leesState } =
    await import('../lib/session');

  /* --- sessiecookie --- */
  const c = maakSessie('Gijselhart1990@Gmail.com');
  ok('sessie leest terug, in kleine letters', leesSessie(c) === 'gijselhart1990@gmail.com');
  ok('geknoeide handtekening wordt geweigerd', leesSessie(`${c.slice(0, -3)}aaa`) === null);
  ok(
    'ander adres met een geleende handtekening faalt',
    leesSessie(`${Buffer.from('inbreker@x.nl').toString('base64url')}.${Date.now() + 1e6}.${c.split('.')[2]}`) === null,
  );
  ok(
    'rommel wordt geweigerd',
    leesSessie('zomaarwat') === null && leesSessie('a.b') === null && leesSessie(null) === null,
  );

  /* --- inloglink --- */
  const { token, id } = maakInlogToken('sander@x.nl');
  const gelezen = leesInlogToken(token);
  ok('inloglink leest terug', gelezen?.email === 'sander@x.nl' && gelezen?.id === id);
  ok('verlopen inloglink faalt', leesInlogToken(maakInlogToken('sander@x.nl', -1).token) === null);
  ok('twee links krijgen een andere id', maakInlogToken('a@b.nl').id !== maakInlogToken('a@b.nl').id);

  /* --- oauth-state --- */
  const st = tekenState('sander@x.nl');
  ok('state leest terug', leesState(st) === 'sander@x.nl');
  ok('oude state faalt', leesState(st, -1) === null);

  /* --- de twee implementaties zijn het eens --- */
  const geheim = process.env.BOB_SESSION_SECRET!;
  ok('middleware accepteert wat lib/session tekent', await middlewareLeest(c, geheim));
  ok('middleware weigert een geknoeid cookie', !(await middlewareLeest(`${c.slice(0, -3)}aaa`, geheim)));

  console.log(uit.join('\n'));
  if (mislukt) process.exit(1);
}

main();

// Zonder een import of export op het hoogste niveau ziet TypeScript dit niet
// als module maar als script, en komt alles wat hier `const` is in de globale
// ruimte terecht. Bestaat er dan ergens een tweede kopie van dit bestand, dan
// botsen die twee op elkaar met een foutmelding die naar het verkeerde bestand
// wijst. Deze ene regel maakt er een module van.
export {};
