# Deployment op Vercel

Gebruik Node.js 22.12 of hoger, npm ci en npm run verify. Werk via preview en PR.

## Tijdelijke opslag aansluiten

Open Vercel > bob-assistent > Storage > Create Database > Upstash Redis.
Maak een afzonderlijke testdatabase en verbind uitsluitend de Preview-omgeving.
Vercel injecteert KV_REST_API_URL en KV_REST_API_TOKEN. Ook de namen
UPSTASH_REDIS_REST_URL en UPSTASH_REDIS_REST_TOKEN worden ondersteund.
Gebruik het read/write-token; alleen lezen is onvoldoende voor inlogbeveiliging.
Houd database-eviction uit: eenmalige tokens mogen niet vroegtijdig verdwijnen.
Na het verbinden: redeploy de onderhoudsbranch.

De aanbieder is Upstash, beheerd via Vercel Marketplace. Netlify is niet meer
nodig voor deze opslag. Er is geen overstap naar openbare Vercel Blob-bestanden.

## Werking en migratie

lib/storage.ts gebruikt Redis REST over HTTPS, SET NX voor eenmalige tokens en
Lua voor atomaire versiecontrole. Netwerkfouten geven 503; er is geen lokale fallback.
Jobs verlopen na een uur, hartslag na vijf minuten, inlogpogingen en gebruikte
links na 24 uur. Inloglinks zelf zijn standaard tien minuten geldig.

Preview krijgt een namespace per project en branch; productie een eigen namespace.
De wissel importeert geen bestaande Netlify-records. Laat bestaande opdrachten
uitlopen en vraag nieuwe inloglinks aan na omschakeling. De bestaande database
voor OAuth-tokens, berichten en instellingen is nog Xano; die gegevens zijn niet
stilzwijgend naar Redis gekopieerd. Een Xano-migratie vereist een apart datamodel
met export/import en controle op aantallen en eigenaarschap.

## Inloggen en testen

Stel BOB_SESSION_SECRET, BOB_ALLOWED_EMAILS, BOB_LOGIN_CODE en NEXT_PUBLIC_SITE_URL
uitsluitend voor de testbranch in. Externe integraties zijn in preview standaard
uitgeschakeld. BOB_PREVIEW_INTEGRATIONS=enabled mag pas na configuratie van testaccounts.
Voer TASK-003 uit. Controleer opslaguitval, dubbele callbacks, gelijktijdige claims
en herstel. Unit tests gebruiken een nagebootste REST-transportlaag; test de Lua-
operatie ook tegen de aangesloten Redis-database vóór productiegebruik.
