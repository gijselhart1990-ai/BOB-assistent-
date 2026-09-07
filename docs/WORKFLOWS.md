# Workflows

## SnelStart-factuurworkflow

1. Selecteer organisatie, klant, periode en goedgekeurde urenregels.
2. Lees klant- en artikelgegevens via de SnelStart-connector.
3. Controleer tariefafspraak, btw-code, periode, dubbele regels en verplichte velden.
4. Toon afwijkingen; stop bij onduidelijkheid.
5. Maak na akkoord een conceptfactuur met idempotency key.
6. Toon het volledige concept, bronregels en verschillen.
7. Vraag apart akkoord voor definitief maken en verzenden.
8. Leg request-id, externe factuur-id, beslissing en resultaat vast in audit.

Een retry mag nooit een dubbele factuur maken. De idempotency key is gebaseerd op organisatie, klant, periode en geselecteerde bronregels.

## Microsoft 365

- **Mailtriage:** lees metadata → classificeer → vat samen → stel antwoorden voor → akkoord → verzend.
- **Agenda:** lees beschikbaarheid → stel opties voor → bevestig account en deelnemers → akkoord → maak afspraak.
- **Document:** zoek bestand → lees toegestane inhoud → maak wijzigingsvoorstel → akkoord → schrijf nieuwe versie.

## Google multi-account

- Selecteer expliciet account en organisatie.
- Toon gebruikte scopes en bron in het plan.
- Vraag bij verzenden/plannen altijd akkoord inclusief gekozen account.
- Houd tokens, quota, fouten en synchronisatiemoment per verbinding apart.

## Takenhub

- Verzamel bronverwijzingen en normaliseer status.
- Dedupliqueer alleen bij sterke bron-ID of bevestigde match.
- Maak BOB-voorstellen aan als concept.
- Vraag akkoord vóór afronden, delegeren of extern wijzigen.

## Workflow Builder-contract

Iedere stap definieert inputschema, outputschema, connector, timeout, retrybeleid, risiconiveau en compensatie. Publiceren van een workflow vraagt goedkeuring en maakt een onveranderlijke versie.
