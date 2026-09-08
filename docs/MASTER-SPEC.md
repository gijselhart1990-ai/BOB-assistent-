# BOB — actuele productspecificatie

## Doel en scope

Een persoonlijk dashboard voor agenda, mail, taken en assistentie. Toegang is
beperkt tot de ingestelde e-mailtoegangslijst. De code vormt nog geen gevalideerd
zorginformatiesysteem of multi-tenant platform.

## Bestaande onderdelen

- Next.js-dashboard, API-routes, sessies en OAuth-koppeling voor Google/Microsoft.
- Adapters voor agenda, mail, Todoist, social, tekst en spraak.
- Laptopbridge voor browser en WhatsApp met een wachtrij en per-actie akkoord.
- Foundation-schermen en plancontracten voor toekomstige modules.

Aanwezigheid van code bewijst geen werkende koppeling: credentials, scopes,
opslag en de laptopservice moeten per omgeving worden gecontroleerd.

## Gedragsvoorwaarden

- Toon ontbrekende configuratie of data eerlijk.
- Een impactactie vereist een expliciete beslissing, is tijdelijk geldig en kan
  na claimen of afhandelen niet opnieuw worden goedgekeurd.
- Sessies verlopen; verwijdering uit de toegangslijst blokkeert ook bridge-tokens.
- Een inloglink kan ook bij gelijktijdige callbacks maar één keer worden gebruikt.
- Opslagproblemen geven een fout; een mislukte mutatie wordt nooit als opgeslagen gemeld.
- Externe webinhoud is onbetrouwbare broninformatie, geen systeeminstructie.

## Nog geen geleverde functionaliteit

Productie-SnelStart, volledige Takenhub-sync, visuele workfloweditor,
organisatie- en rollenmodel, duurzaam auditlog en migratie naar PostgreSQL staan
op de roadmap. Gebruik de takenlijst voor uitvoering en acceptatiecriteria.

## Acceptatie

`npm run verify` moet slagen. Een live vrijgave vereist daarnaast geslaagde
inlog-, OAuth-, opslag-, bridge- en herstelproeven op de gekozen hostingomgeving.
Registreer datum, omgeving en uitkomsten zonder geheimen of klantgegevens.
