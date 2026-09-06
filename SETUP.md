# BOB opzetten — van niets naar een werkende privésite

Reken op **een uur** voor stap 1 t/m 6; dan staat de site en kun je inloggen.
De connectoren daarna zijn los van elkaar: stop je halverwege, dan werkt de
rest gewoon.

Elke stap zegt wat je doet, en waar het misgaat als je iets overslaat.

---

## Wat je nodig hebt

- Een GitHub-account
- Een Netlify-account (gratis plan volstaat)
- Een Xano-account op [app.xano.com](https://app.xano.com) (gratis plan volstaat)
- Node 20 of hoger op je laptop
- De sleutels die je al hebt: Anthropic, Cartesia, Todoist, Google, Microsoft, Brave
- Eventueel een [Resend](https://resend.com)-account om de inloglink te mailen —
  gratis, en in tien minuten geregeld. Zolang je die niet hebt, kun je met een
  code inloggen (zie stap 4).

---

## Stap 1 — De repo op GitHub

Pak de map uit en zet er een repo van. **Privé**, want er komen straks
verwijzingen naar jouw agenda en mail in de commits.

```bash
cd bob-web
git init
git add .
git commit -m "BOB als privéwebsite: eerste versie"

gh repo create bob-web --private --source=. --push
```

Geen `gh`? Maak dan handmatig een lege privé-repo op github.com en:

```bash
git remote add origin git@github.com:JOUW-NAAM/bob-web.git
git branch -M main
git push -u origin main
```

> `.gitignore` houdt `.env`, `.env.local` en `bridge/.env` buiten de repo.
> Controleer dat vóór je pusht: `git status` mag geen `.env` tonen.

---

## Stap 2 — Xano: de database

Xano bewaart hier alleen tabellen. Geen endpoints, geen functies, geen logica —
dat staat allemaal in deze website. Dat is een bewuste keuze: als er iets niet
klopt, hoef je maar op één plek te kijken, en je kunt alles wat de site doet
teruglezen in code in plaats van in een visuele editor.

1. Maak een workspace op [app.xano.com](https://app.xano.com). Kies bij het
   aanmaken een regio in Europa — dat scheelt latency en het houdt je gegevens
   in de EU.
2. Ga naar **Account → Metadata API** en maak een token met deze scopes:
   - Workspace Content: **Read/Write**
   - Workspace Database: **Read/Write**
3. Noteer drie dingen:
   - de **instance-URL** (staat bovenaan je workspace, bijv. `https://x8ki-letl-twmt.n7.xano.io`)
   - het **token** dat je net maakte
   - het **workspace-ID** (het nummer in de URL van je workspace)

Zet die drie in je lokale `.env`:

```
XANO_INSTANCE_URL=https://xxxx-xxxx-xxxx.n7.xano.io
XANO_METADATA_TOKEN=...
XANO_WORKSPACE_ID=...
```

### De tabellen aanmaken

```bash
npm install
npm run xano -- --maak
```

Dat maakt vier tabellen aan en drukt de regels af die je straks bij Netlify
moet zetten:

```
XANO_TABLE_OAUTH_TOKENS=...
XANO_TABLE_BERICHTEN=...
XANO_TABLE_INSTELLINGEN=...
XANO_TABLE_BRIDGE_TOKENS=...
```

Xano werkt met tabel-**ID's**, niet met namen — vandaar dit script in plaats
van een lijstje hier. Draai je `npm run xano` zonder `--maak`, dan kijkt hij
alleen wat er staat.

Lukt het aanmaken niet (Xano verandert wel eens iets aan die API), dan zegt het
script per tabel welke kolommen je met de hand moet aanmaken. Zorg dat de
tabelnamen kloppen en draai het daarna nog eens zonder `--maak` om de ID's op
te halen.

> Xano kent geen row-level security zoals Postgres. Het slot zit hier in de
> code: elke aanroep gebeurt server-side, met een token dat alleen bij Netlify
> staat, en pas nadat is vastgesteld wie je bent. De browser praat nooit
> rechtstreeks met Xano — er is geen enkele Xano-URL in de frontend.

### Wat NIET in Xano staat

De wachtrij naar je laptop en de hartslag staan in **Netlify Blobs**. Dat moet
wel: het gratis plan van Xano staat tien verzoeken per twintig seconden toe, en
je laptop vraagt elke seconde of er werk is. Netlify Blobs hoort bij je site,
kost niets extra en kent die limiet niet. Je hoeft er niets voor in te stellen.

---

## Stap 3 — Netlify: de site

1. **Add new site → Import an existing project** → kies je GitHub-repo.
2. Build-instellingen laat je staan; `netlify.toml` regelt het al.
3. Deploy. De eerste build faalt waarschijnlijk op ontbrekende variabelen —
   dat is verwacht, die zetten we nu.

### Omgevingsvariabelen

**Site configuration → Environment variables**. Neem `.env.example` erbij en
vul in wat je hebt. Het minimum om te kunnen inloggen:

```
NEXT_PUBLIC_SITE_URL          https://jouw-bob.netlify.app
BOB_SESSION_SECRET            (zie hieronder)
BOB_ALLOWED_EMAILS            jouw@email.nl
XANO_INSTANCE_URL             https://xxxx.n7.xano.io
XANO_METADATA_TOKEN           ...
XANO_WORKSPACE_ID             ...
XANO_TABLE_OAUTH_TOKENS       (uit npm run xano)
XANO_TABLE_BERICHTEN          (uit npm run xano)
XANO_TABLE_INSTELLINGEN       (uit npm run xano)
XANO_TABLE_BRIDGE_TOKENS      (uit npm run xano)
```

`BOB_SESSION_SECRET` maak je zo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Daar wordt je sessiecookie mee ondertekend. Twee dingen om te weten: hij mag
nooit in de repo, en verander je hem, dan is iedereen op slag uitgelogd. Dat
laatste is geen bug maar je noodrem.

`BOB_ALLOWED_EMAILS` is de tweede grendel. Wie er niet op staat komt er ook met
een geldige inloglink niet in — en toegang intrekken is één variabele wijzigen.

Om de inloglink te kunnen versturen heb je één van deze twee nodig:

```
RESEND_API_KEY                resend.com → API Keys
SENDGRID_API_KEY              sendgrid.com
BOB_MAIL_FROM                 BOB <onboarding@resend.dev>
```

En daarna, per connector:

```
ANTHROPIC_API_KEY             het brein
CARTESIA_API_KEY + VOICE_ID   de stem
TODOIST_API_TOKEN             taken
GOOGLE_CLIENT_ID + SECRET     agenda en Gmail
MICROSOFT_CLIENT_ID           Outlook
BRAVE_API_KEY                 zoeken
```

Trigger daarna een nieuwe deploy (**Deploys → Trigger deploy → Clear cache and deploy**).

> Netlify geeft je een URL als `random-naam-123.netlify.app`. Die kun je
> wijzigen onder **Site configuration → Site details → Change site name**.
> Vergeet dan niet `NEXT_PUBLIC_SITE_URL` en de OAuth-redirects mee te
> veranderen.

---

## Stap 4 — Inloggen

Ga naar je site. Je komt op de inlogpagina, vult je adres in en krijgt een link
in je mail. Die link is **tien minuten geldig en werkt één keer** — een tweede
klik erop doet niets meer. Klik hem aan en je staat op het dashboard.

### Nog geen mailer?

Zet dan tijdelijk een lange geheime code bij Netlify:

```
BOB_LOGIN_CODE=  (minstens 20 tekens, zelf verzinnen of genereren)
```

Op de inlogpagina klik je op *Ik heb een inlogcode*, vult je adres en die code
in, en je bent binnen. Haal hem weg zodra de mail werkt — een code die niet
verloopt is zwakker dan een link die dat wel doet.

Werkt het niet, dan is het bijna altijd één van deze:

| Wat je ziet | Wat er aan de hand is |
|---|---|
| Meteen terug op inloggen, met "BOB_SESSION_SECRET ontbreekt" | Die variabele staat er niet, of is korter dan 32 tekens |
| "Dit adres staat niet op de toegangslijst" | `BOB_ALLOWED_EMAILS` klopt niet, of de deploy is van vóór het invullen |
| "Die link is al een keer gebruikt" | Klopt — vraag een nieuwe aan. Linkchecker van je mailprogramma kan hem ook al "geklikt" hebben |
| "Er is nog geen mailer ingesteld" | `RESEND_API_KEY` ontbreekt. Gebruik zolang `BOB_LOGIN_CODE` |
| Geen mail, wel "kijk in je mail" | Kijk in spam. Het antwoord is met opzet altijd hetzelfde, ook voor een onbekend adres — anders kun je hiermee de toegangslijst uitlezen |

---

## Stap 5 — Google en Microsoft koppelen

Beide werken met OAuth en hebben een redirect-URI nodig die naar jouw site wijst.

**Google** — [console.cloud.google.com](https://console.cloud.google.com):
- APIs & Services → Library: zet **Google Calendar API** en **Gmail API** aan
- OAuth consent screen: External, jezelf bij *Test users*
- Credentials → OAuth client ID → Web application
- Authorized redirect URI: `https://jouw-bob.netlify.app/api/oauth/google/callback`

**Microsoft** — [entra.microsoft.com](https://entra.microsoft.com):
- App registrations → New registration
- Redirect URI (Web): `https://jouw-bob.netlify.app/api/oauth/microsoft/callback`
- API permissions: `User.Read`, `Mail.Read`, `Calendars.Read` — **delegated**,
  niet application. Application-rechten geven je app toegang tot de hele
  tenant; dat heb je niet nodig en wil je niet.

Zet de client-ID's (en voor Google het secret) bij Netlify, deploy opnieuw, en
klik in het dashboard onder **Instellingen → Koppelingen** op Koppelen.

---

## Stap 6 — Je laptop koppelen (de bridge)

Browseracties en WhatsApp kunnen niet in de cloud draaien: die hebben een
blijvend openstaande browser nodig op een echte machine. Dat wordt jouw laptop.

Het verkeer gaat één kant op — je laptop vraagt de site om werk. Er hoeft
niets opengezet te worden op je router.

**In het dashboard:** Instellingen → Je laptop → *Nieuw bridge-token maken*.
Kopieer het token; je ziet hem één keer.

**Op je laptop:**

```
cd bridge
copy .env.example .env      (macOS/Linux: cp .env.example .env)
```

Vul in `.env` in:

```
BOB_SITE_URL=https://jouw-bob.netlify.app
BOB_BRIDGE_TOKEN=bob_...
```

Dan installeren en starten:

```
bob-bridge install        (Windows)
bob-bridge                (Windows)

npm install && npm start  (macOS/Linux)
```

In het dashboard springt **Je laptop** op *online*. WhatsApp koppel je daarna
via **Koppelen** — één QR-code scannen, daarna onthoudt hij het.

> Wil je dat de bridge automatisch meestart: maak een snelkoppeling naar
> `bob-bridge.cmd` en zet die in
> `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`.

---

## Stap 7 — Claude Code erop aansluiten

Open de repo-map met Claude Code. `CLAUDE.md` staat er al: daarin staat hoe het
project in elkaar zit en welke regels niet onderhandelbaar zijn.

Er zitten drie commando's bij:

```
/deploy          controleren, committen en publiceren
/nieuw-scherm    een scherm toevoegen in dezelfde stijl
/migratie        een tabelwijziging schrijven en toepassen
```

### MCP-servers

`.mcp.json` staat klaar voor Xano, Netlify en GitHub. Zet de tokens in je
omgeving:

```
NETLIFY_PERSONAL_ACCESS_TOKEN  netlify.com → User settings → Applications
GITHUB_PERSONAL_ACCESS_TOKEN   github.com → Settings → Developer settings
```

De Xano-server (`@xano/developer-mcp`) vraagt bij de eerste keer zelf om in te
loggen. Hij kan je workspace wél wijzigen — er is geen alleen-lezen stand. Laat
Claude daarom tabelwijzigingen doen via `scripts/xano-tabellen.mjs`, dat je in
de repo terugziet en dus in de geschiedenis staat. Dat scheelt een keer per
ongeluk een tabel leegmaken zonder dat je kunt zien wat er gebeurde.

---

## Later: een eigen domein

Koop een domein waar je wilt en zet het in Netlify onder **Domain management**.
Netlify regelt het certificaat. Daarna aanpassen:

- `NEXT_PUBLIC_SITE_URL` bij Netlify
- de redirect-URI's bij Google en Microsoft
- `BOB_SITE_URL` in `bridge/.env` op je laptop

---

## Wat er waar staat, en waarom dat uitmaakt

| Gegeven | Waar | Wie kan erbij |
|---|---|---|
| API-sleutels | Netlify environment variables | alleen de server |
| OAuth-tokens | Xano, alleen via de Metadata API | alleen de server |
| Gesprekken met BOB | Xano, tabel `bob_berichten` | alleen de server |
| Bridge-token | Xano, **alleen de hash** — het token zelf nergens | — |
| Wachtrij naar je laptop | Netlify Blobs, verdwijnt zodra de opdracht klaar is | alleen de server |
| Je sessie | een ondertekend cookie in je browser, verder nergens | alleen jij |
| Mailinhoud | **nergens** — alleen afzender en onderwerp worden opgehaald | — |
| WhatsApp-berichten | **nergens** — alleen wie er wacht en hoeveel | — |
| Wachtwoorden | **nergens** — BOB vult ze niet in en slaat ze niet op | — |

Die derde regel van onderen is het vermelden waard: er staat nergens iets
waarmee je sessie te heropenen is. Het cookie is een handtekening over je
adres en een verlooptijd. Lekt de database, dan lekt je toegang niet mee.

---

## Als er iets niet werkt

```bash
npm run env        # elke sleutel één keer bellen en zeggen of hij werkt
npm run verify     # typecheck, test en build, lokaal
npm run xano       # kijken of de vier tabellen er staan
```

`npm run env` is bijna altijd het snelste antwoord: het zegt per variabele of
hij ontbreekt, de verkeerde vorm heeft, of door de dienst zelf wordt
geweigerd. Sleutels worden gemaskeerd afgedrukt, dus die uitvoer kun je
delen.

| Symptoom | Oorzaak |
|---|---|
| 401 op alle API-routes | Sessie verlopen, of je adres staat niet meer in `BOB_ALLOWED_EMAILS` |
| "Xano geeft een snelheidslimiet terug" | Het gratis plan doet tien verzoeken per twintig seconden. Wacht even; blijft het gebeuren, dan vraagt iets te vaak |
| "Tabel-ID voor ... ontbreekt" | Een `XANO_TABLE_*` variabele is niet gezet. Draai `npm run xano` |
| "Je laptop is niet bereikbaar" | Bridge draait niet, of het token is ingetrokken |
| Google/Outlook 428 | Token verlopen — opnieuw koppelen bij Instellingen |
| Todoist geeft een foutmelding | Todoist heft endpoints op; de code probeert er drie, de foutmelding zegt welke faalden |
| Chat geeft 503 | `ANTHROPIC_API_KEY` ontbreekt of is ongeldig |
| Build faalt op Netlify | Bijna altijd een ontbrekende `NEXT_PUBLIC_*` variabele |
