# Outlook via Vercel

De Outlook-connector gebruikt Neon voor versleutelde tokens. Elke koppeling hoort
bij één ingelogde BOB-eigenaar en één bestaande Google-werkcontext. Buiten die
werkcontext haalt BOB geen Outlook-mail of agenda op, ook niet voor AI-antwoorden.
Dit is een persoonlijke werkcontextselectie, geen organisatierollenmodel.

## Voorbereiden

1. Voer `migrations/003_microsoft_accounts.sql` uit in de Preview-database waarin
   de Google-accounttabellen al bestaan. Het script voegt alleen een tabel toe.
2. Gebruik de bestaande `DATABASE_URL` en `BOB_ACCOUNT_ENCRYPTION_KEY` van Preview.
   De sleutel moet behouden blijven om bestaande accounttokens te kunnen lezen.
3. Registreer een Microsoft **Web**-app met de exacte stabiele Preview-URL gevolgd
   door `/api/oauth/microsoft/callback`. Impliciete tokenstromen zijn niet nodig.
4. Stel uitsluitend voor de bedoelde Preview-branch deze Vercel-variabelen in:

| Variabele | Waarde |
|---|---|
| `BOB_PREVIEW_MICROSOFT_CLIENT_ID` | Toepassings-id uit Microsoft Entra |
| `BOB_PREVIEW_MICROSOFT_CLIENT_SECRET` | Waarde van het web-clientgeheim, nooit de geheim-id |
| `BOB_PREVIEW_MICROSOFT_TENANT` | UUID van de bedoelde Microsoft-tenant |
| `BOB_PREVIEW_MICROSOFT_ACCOUNT_EMAIL` | Mailadres van de toegestane Microsoft-mailbox |
| `BOB_PREVIEW_MICROSOFT_CONTEXT_EMAIL` | Mailadres van het bijbehorende gekoppelde Google-account |

5. Deploy de branch opnieuw, selecteer de bedoelde Google-werkcontext en kies
   Microsoft koppelen onder Instellingen. De eigenaar beoordeelt de Microsoft-
   toestemming voor `User.Read`, `Mail.Read`, `Calendars.Read` en `offline_access`.

## Aanmelding en opslag

De tenant wordt vastgezet in het autorisatie- en tokeneindpunt. De server verifieert
de mailbox via Graph `/me` voordat hij tokens bewaart. De aanmelding gebruikt PKCE
S256 en een versleutelde HttpOnly-cookie die tien minuten geldig is. De callback
controleert de ingelogde eigenaar, state en dezelfde geselecteerde werkcontext;
Redis claimt de aanmelding één keer. Een accountwissel tijdens aanmelden vereist
een nieuwe aanmelding. Alleen volledige leestoestemming levert een koppeling op.

Tokens zijn met AES-256-GCM gebonden aan omgeving, eigenaar, werkcontext, tenant
en Microsoft-identiteit. Vernieuwen behoudt een ontbrekende refresh-sleutel en
verwerkt rotatie. Een versiecontrole voorkomt dat een vertraagd antwoord een
nieuwere koppeling overschrijft. Opslagfouten stoppen de bewerking.

Caches zijn per eigenaar, werkcontext en versie van de Microsoft-koppeling.
Er worden geen mails verzonden of agenda-items gewijzigd.

## Acceptatie en migratiegrenzen

Geïsoleerde tests controleren PKCE, cookie/state/owner/context, vervaltijd,
mailboxcontrole, leesscopes, tokenrotatie, opslagisolatie en versieconflicten.
`npm run verify` controleert ook lint, types en build.

Live acceptatie blijft nodig: toestemming, mail en agenda ophalen, uitsluiting in
de andere werkcontext, behoud na deployment en verversing na tokenverloop.
Er is geen automatische import van oude Microsoft-tokens uit Xano. Ook buiten
Preview vereist deze connector de PostgreSQL-Google-werkcontext en de overeenkomstige
`MICROSOFT_*`-configuratie. Plan een herkoppeling vóór een eventuele productierelease;
deze branch wordt uitsluitend als Preview getest.

Bron: [Microsoft authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).
