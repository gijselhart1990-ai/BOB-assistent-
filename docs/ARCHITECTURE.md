# Architectuur

## Huidige implementatie

```mermaid
flowchart TD
  UI[Next.js dashboard] --> API[API-routes: authenticatie en validatie]
  API --> AI[AI en tools]
  API --> CONNECT[Provideradapters]
  AI --> CONNECT
  CONNECT --> XANO[Xano: tokens, berichten, instellingen]
  API --> BLOBS[Redis via Vercel Marketplace: inlogbeveiliging en wachtrij]
  AI --> BLOBS
  LAPTOP[Laptopbridge: browser en WhatsApp] --> BLOBS
```

- app bevat routes; components bevat gedeelde interface.
- lib bevat domeinlogica, authenticatie, provideradapters en opslagtoegang.
- lib/foundation bevat moduledefinities en plannen, zonder uitvoerende workflowengine.
- bridge is een apart laptopproces met eigen afhankelijkheden.
- tests bevat regressietests; scripts bevat beheertaken.

De app is een modulair monoliet voor persoonlijk gebruik. De gebruikerssleutel
is een e-mailadres. Dit is geen volwaardig organisatiemodel of tenantisolatie.

## Opslag en uitvoering

Preview gebruikt inmiddels Neon voor Google-accounts, chatgeschiedenis en
Microsoft-koppelingen. Outlook-tokens zijn versleuteld en gekoppeld aan één
Google-werkcontext; accountkeuze begrenst zowel het dashboard als AI-opvragingen.
De Microsoft-callback gebruikt PKCE, een versleutelde sessiegebonden cookie en
een eenmalige Redis-claim. Zie [Outlook via Vercel](OUTLOOK-VERCEL.md) voor migratie
en de voorwaarden vóór een productierelease. De legacy Xano-route blijft voor
overige bestaande gegevens bestaan.

Xano wordt via de Metadata API gebruikt. Updates nemen de bestaande rij mee:
PUT vervangt een record. Verzoeken hebben een tijdslimiet; transacties en
concurrente upserts zijn daarmee nog niet opgelost.

Redis bewaart tijdelijke records met een vervaltijd. Eenmalige inloglinks gebruiken
SET NX. Wachtrijclaims en beslissingen gebruiken een versietoken-vergelijking;
twee gelijktijdige updates kunnen elkaar zo niet stil overschrijven. Een
opslagstoring is een fout, geen toestemming of succesvolle mutatie.

De queue claimt maximaal eenmaal. Na een crash tijdens een browseractie is de
uitkomst mogelijk onzeker; voer zo'n actie niet automatisch opnieuw uit.
Een toekomstige worker vereist idempotency en expliciete herstelstatussen.

## Beveiligingsgrenzen

Middleware controleert sessies; routes controleren ook de toegangslijst.
Bridge-tokens zijn gehasht opgeslagen en vereisen een nog toegestane gebruiker.
Weblezers controleren openbare IP-adressen, redirects en responsomvang; DNS
wordt voor de verbinding vastgezet. De laptopbrowser heeft een afzonderlijk
netwerk- en interactiebeleid dat bij live acceptatie moet worden beoordeeld.

## Hosting

Vercel host de Next.js-app. Upstash Redis wordt via Vercel Marketplace gekoppeld
met KV_REST_API_URL en KV_REST_API_TOKEN (of de UPSTASH_REDIS_REST-varianten).
Zonder die opslag werken inlogbeveiliging en bridge niet. Zie DEPLOYMENT.md.

## Doelarchitectuur

Organisaties/rollen, auditlog, persistente workers en visuele
workflowversies zijn roadmaponderdelen. Ze zijn geen bestaande runtime-
afhankelijkheden en vereisen een afzonderlijke migratie met acceptatietests.
