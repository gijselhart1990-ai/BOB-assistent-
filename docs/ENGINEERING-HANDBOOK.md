# Engineering Handbook

## Ontwikkelen

Gebruik Node.js 22.12 of hoger en npm. Voer `npm ci` uit en kopieer
`.env.example` naar `.env.local`. Vul alleen noodzakelijke waarden lokaal in.
`npm run dev` start het dashboard. `npm run verify` voert lint, TypeScript,
regressietests en de productiebuild uit. Deze controles vereisen geen echte sleutels.

## Indeling

| Locatie | Verantwoordelijkheid |
|---|---|
| app/(dash) | Dashboardroutes en schermcompositie |
| app/api | Authenticatie, invoercontrole en HTTP-antwoorden |
| components | Herbruikbare interface en ophaalhook |
| lib/connectors | Externe provideradapters |
| lib/ai | Modelaanroepen en gereedschappen |
| lib/foundation | Plan- en modulecontracten; geen productie-workflowengine |
| lib/web | Publieke webpagina's veilig ophalen en tekst extraheren |
| lib/blobs.ts, lib/xano.ts | Duurzame opslaggrenzen |
| bridge | Apart laptopproces; eigen afhankelijkheden |
| tests | Geïsoleerde tests zonder klantgegevens |
| scripts | Expliciete beheer- en diagnosecommando's |
| docs | Architectuur, beheer, specificatie en roadmap |
| tasks | Concrete opdrachten met acceptatiecriteria |

Routes horen dun te blijven. Deel domeinlogica via lib en houd providerverkeer
uit componenten. Verplaats bestaande routes niet alleen voor een nettere boom:
URL's en imports zijn onderdeel van het contract.

## Fouten en concurrency

Een ontbrekend record is iets anders dan onbereikbare opslag. Mutaties en
inlogbeveiliging falen gesloten bij opslagproblemen. Een optioneel statuspaneel
mag een expliciete onbeschikbaarstatus tonen. Gebruik ETags voor wijzigingen
die elkaar kunnen overschrijven en `onlyIfNew` voor eenmalige tokens.
Strong consistency alleen is geen lock. Retry geen impactactie blind.

JSON-beslissingen accepteren uitsluitend echte booleans en UUID's.
Onbekende Foundation-acties vragen akkoord. Dit plancontract voert niets uit.
Webverzoeken controleren DNS, redirects en grootte; de verbinding gebruikt het
gecontroleerde adres. Houd de browserbridge als afzonderlijke uitvoeringsgrens.

## Wijzigingen opleveren

1. Maak een branch en beschrijf probleem en acceptatiecriteria.
2. Voeg bij gedragswijzigingen een regressietest toe die het oorspronkelijke probleem vangt.
3. Voer `npm run verify` en `npm audit` uit; controleer het diff op geheimen en gegenereerde bestanden.
4. Open een pull request met resultaat, tests en resterende beperkingen.
5. Test live integraties met expliciet aangewezen testaccounts voordat ze productiegereed heten.

De bestaande interface bevat nog losse `any`-typen. Lint bewaakt nu ongebruikte
code en TypeScript-fouten; striktere providercontracten kunnen per module worden
ingevoerd. Een volledige herschrijving is geen voorwaarde voor onderhoud.

## Afhankelijkheden

Het lockbestand hoort bij iedere update. PostCSS heeft tijdelijk een override
naar een gepatchte 8.5-versie vanwege de upstream advisories. Verwijder die pas
als Next.js zelf een veilige versie levert en verify plus audit slagen.
Dependabot stelt updates via pull requests voor; er is geen automatische merge.
