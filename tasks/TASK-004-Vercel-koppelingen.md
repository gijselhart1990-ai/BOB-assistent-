# TASK-004 — Koppelingen met vaste opslag via Vercel

Status: gratis Neon-database bob-preview-db in Frankfurt aangemaakt en met
uitsluitend Vercel Preview verbonden. Google-accounts nog niet aangesloten.
De migratie migrations/001_google_accounts.sql is voorbereid, nog niet uitgevoerd.
Opslagadapter, versleuteling, OAuth-opslag en accountkiezer zijn geïmplementeerd
voor Preview. Tests voor versleuteling, lint, typecontrole en build slagen.
Live SQL-acceptatie en koppelen van twee accounts blijven open. De query-editor
van Vercel vraagt tweestapsverificatie voordat de migratie kan worden uitgevoerd.

## Besloten

- Beheer via Vercel; gebruiker kiest inmiddels een bestaand zakelijk Google-account
  als eerste koppeling, met later een tweede eigen Gmail-account. Het adres hoort
  in de private configuratie, niet in deze openbare repository.
- Het dashboard krijgt een accountkiezer; mail, agenda en AI-context volgen het
  gekozen account. Zakelijke gegevens worden niet als testfixtures opgeslagen.
- Bestaande AI-preview werkt: een neutrale rekenvraag kreeg antwoord 4.
- Alleen testgegevens; geen import van bestaande Xano-records.

## Geconstateerde afhankelijkheden

OAuth-tokens, chatgeschiedenis en bridge-tokens gebruiken nog lib/xano.ts.
De preview schakelt Xano uit. Alleen Google-clientcredentials toevoegen is dus
onvoldoende: de callback kan het token dan niet bewaren.
Redis bewaart uitsluitend tijdelijke records met TTL; gebruik die functies niet
voor blijvende OAuth-tokens. WhatsApp gebruikt een afzonderlijk laptopproces.

## Voorgestelde uitvoering

1. Maak bob-preview-db als Neon PostgreSQL via Vercel Marketplace, uitsluitend
   op een gratis plan en voor Preview. Controleer regio, rechten en voorwaarden
   vóór aanmaken. Uitgevoerd na expliciete toestemming voor database en voorwaarden.
2. Voeg een opslagadapter en migratie toe voor OAuth-tokens. Gebruik een unieke
   sleutel per omgeving, BOB-gebruiker, provider en geverifieerd provider-account-ID;
   atomair upsert. Een tweede Google-account mag het eerste niet overschrijven. Bewaar een
   bestaand refresh-token wanneer de provider geen vervanger terugstuurt.
   Versleutel tokens op applicatieniveau met een aparte serversecret; log ze niet.
3. Activeer Google en Microsoft elk via eigen previewconfiguratie. Controleer
   configuratie en opslag vóór de OAuth-redirect. Laat andere integraties uit.
4. Maak een Google-testclient met Gmail- en Calendar-API en de bestaande
   leesscopes. Registreer de exacte previewcallback /api/oauth/google/callback
   op de vaste previewhost. Voeg uitsluitend de aangewezen eigen accounts toe.
5. Laat de gebruiker de concrete Google-toestemming beoordelen. Test één
   aangewezen mail en afspraak, tokenverversing en ontkoppelen per account.
   Test accountwisselen eerst met nagebootste data: vertraagde antwoorden en caches
   van het vorige account mogen na omschakelen niet op het scherm verschijnen.
6. Herhaal voor Microsoft met een aangewezen testaccount en callback
   /api/oauth/microsoft/callback. Zet chat- en bridge-opslag vervolgens over
   via afzonderlijke migraties; pas daarna de WhatsApp-laptopbridge aansluiten.

## Acceptatie

- Token blijft na redeploy beschikbaar, zonder productiegegevens te benaderen.
- Ontbrekende opslag geeft een fout; geen fictieve succesvolle koppeling.
- Geen tokens in browser, logs of openbare repository.
- Tests bewijzen gebruikersisolatie, upsert, behoud refresh-token en fouten.
- Tests bewijzen dat koppeling van een tweede account het eerste intact laat,
  accountselectie eigenaarschap controleert en cache- en AI-context per account scheidt.
- npm run verify slaagt; live mail/agenda-test staat apart vermeld.
- WhatsApp is pas gekoppeld na bevestigde laptopverbinding en QR-aanmelding.

De preview kan Google-tokens in Neon bewaren zodra de migratie is uitgevoerd.
Productie en opslag van chatberichten, instellingen en bridge-tokens blijven Xano
gebruiken. Previewchat werkt zonder blijvende geschiedenis zolang Xano uit staat.
