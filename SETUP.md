# BOB opzetten op Vercel

Volg eerst [Deployment](docs/DEPLOYMENT.md) voor Vercel, Redis en een geïsoleerde
preview. Gebruik Node.js 22.12 of hoger. Kopieer `.env.example` naar `.env.local`
voor lokaal ontwikkelen. Bewaar geheimen buiten Git.

## Duurzame gegevens en koppelingen

De onderstaande Xano-, OAuth- en bridge-instructies beschrijven de bestaande
koppelingen. Redis vervangt alleen de tijdelijke opslag. Schakel externe
integraties in preview pas in met afzonderlijke testaccounts.

## Xano: de database

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

Dat maakt vier tabellen aan en drukt de regels af die je straks bij Vercel
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
> code: elke aanroep gebeurt server-side, met een token dat alleen bij Vercel
> staat, en pas nadat is vastgesteld wie je bent. De browser praat nooit
> rechtstreeks met Xano — er is geen enkele Xano-URL in de frontend.


## Inloggen

Ga naar je site. Je komt op de inlogpagina, vult je adres in en krijgt een link
in je mail. Die link is **tien minuten geldig en werkt één keer** — een tweede
klik erop doet niets meer. Klik hem aan en je staat op het dashboard.

### Nog geen mailer?

Zet dan tijdelijk een lange geheime code bij Vercel:

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

## Google en Microsoft koppelen

Beide werken met OAuth en hebben een redirect-URI nodig die naar jouw site wijst.

**Google** — [console.cloud.google.com](https://console.cloud.google.com):
- APIs & Services → Library: zet **Google Calendar API** en **Gmail API** aan
- OAuth consent screen: External, jezelf bij *Test users*
- Credentials → OAuth client ID → Web application
- Authorized redirect URI: `https://jouw-bob.vercel.app/api/oauth/google/callback`

**Microsoft** — [entra.microsoft.com](https://entra.microsoft.com):
- App registrations → New registration
- Redirect URI (Web): `https://jouw-bob.vercel.app/api/oauth/microsoft/callback`
- API permissions: `User.Read`, `Mail.Read`, `Calendars.Read` — **delegated**,
  niet application. Application-rechten geven je app toegang tot de hele
  tenant; dat heb je niet nodig en wil je niet.

Zet de client-ID's (en voor Google het secret) bij Vercel, deploy opnieuw, en
klik in het dashboard onder **Instellingen → Koppelingen** op Koppelen.

---

## Je laptop koppelen (de bridge)

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
BOB_SITE_URL=https://jouw-bob.vercel.app
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
