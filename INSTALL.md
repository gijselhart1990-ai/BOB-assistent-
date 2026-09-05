# BOB — installatie, stap voor stap

Elke stap staat op zichzelf. BOB start ook als je halverwege stopt: wat niet
gekoppeld is, toont gewoon "niet verbonden" in plaats van te crashen.

Reken op **10 minuten** voor stap 1 t/m 3 (dan praat BOB al). De rest is
per connector 5 tot 15 minuten.

---

## Stap 0 — Node.js

BOB heeft Node 20 of hoger nodig.

```powershell
node --version
```

Krijg je een foutmelding of een lager nummer: haal de **LTS**-versie van
<https://nodejs.org>, installeer die, en open daarna een **nieuw**
PowerShell-venster (anders kent Windows het commando nog niet).

---

## Stap 1 — Installeren

Open PowerShell in de BOB-map en draai:

```powershell
.\install-bob.ps1
```

Krijg je "kan niet worden geladen omdat het uitvoeren van scripts is
uitgeschakeld", start hem dan zo:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-bob.ps1
```

### Als PowerShell dwarsligt

Veel werklaptops hebben *running scripts is disabled* aanstaan. Dat blokkeert
`.ps1`-bestanden én `npm` (want dat is `npm.ps1`), maar **niet** `.cmd`-bestanden
en **niet** `node.exe`. Daarom zit er een `bob.cmd` bij die overal omheen werkt:

```
bob                     start BOB
bob doctor              controleer de installatie
bob env                 welke .env gebruikt deze BOB
bob env scan            zoek andere kopieën op deze computer
bob env import          neem de meest complete .env en logins over
bob connect-microsoft   koppel Outlook zonder client secret
bob connect-whatsapp    koppel WhatsApp via je eigen Chrome
bob check-microsoft     test je Microsoft client secret
bob set-secret NAAM     zet een sleutel veilig in .env
bob demo off            zet voorbeelddata uit
bob install             installeer de pakketten
```

Je kunt ook altijd `node` direct aanroepen: `node scripts/doctor.js`.

### Meerdere kopieën naast elkaar

De makkelijkste manier om jezelf voor de gek te houden: sleutels invullen in
map A, BOB starten vanuit map B, en alles staat op "niet gekoppeld". Bij elke
nieuwe uitpak loop je dat risico.

```powershell
.\bob env scan
```

Toont alle BOB-installaties op je computer, met per stuk hoeveel sleutels
ingevuld zijn en waar je al ingelogd bent. Draait de verkeerde, dan haalt
`.\bob env import` de volste `.env` én je bestaande logins hierheen — ook als
die in verschillende mappen staan. Je oude `.env` wordt eerst geback-upt.

Wil je het permanent oplossen — dit mag zonder beheerdersrechten, maar
overleg het even met je IT-afdeling op een werklaptop:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Het script installeert de pakketten, maakt je `.env` aan, vraagt om je
Cartesia-sleutels en zet een snelkoppeling op je bureaublad.

Liever met de hand:

```powershell
npm install
copy .env.example .env
```

---

## Stap 2 — De stem (Cartesia)

Je vindt je key en voice-ID op <https://play.cartesia.ai>, onder **API Keys**
en **Voices**. Zet ze er zo in:

```powershell
.\bob set-secret CARTESIA_API_KEY
.\bob set-secret CARTESIA_VOICE_ID
```

Dat vraagt de waarde via een prompt. Gebruik dit liever dan `.env` met de hand
bewerken of via PowerShell `-replace`: in een vervangtekst heeft `$` een
speciale betekenis, waardoor er stilletjes tekens uit je sleutel verdwijnen en
je een foutmelding krijgt die nergens naar lijkt te wijzen.

> Deel een sleutel nooit in een chat, mail of screenshot. Gebeurt het toch,
> trek hem dan in bij de leverancier en maak een nieuwe aan — dat is altijd
> sneller dan uitzoeken of iemand hem gezien heeft.

Controleren:

```powershell
.\bob doctor
```

Groen vinkje bij "TTS werkt"? Dan kan BOB praten.

**Talen.** BOB staat op Nederlands (`CARTESIA_LANGUAGE=nl`). Zowel de stem
(`sonic-3.6`) als de spraakherkenning (`ink-whisper`) ondersteunen Nederlands.

---

## Stap 3 — Starten

```powershell
.\start-bob.ps1
```

Of dubbelklik op de **BOB**-snelkoppeling op je bureaublad. Je browser opent
op <http://localhost:4321>.

Wil je eerst zien hoe het eruitziet zonder iets te koppelen? Zet
`BOB_DEMO=1` in `.env`, herstart, en het dashboard vult zich met
voorbeelddata. Er staat een gele balk bij zodat je nooit vergeet dat het nep is.

**Praten met BOB:**

| Wat | Hoe |
|---|---|
| Spreken | Houd de **spatiebalk** ingedrukt, praat, laat los |
| Ook spreken | Klik en houd de groene microfoonknop rechtsonder |
| Typen | `Ctrl+K`, typ je vraag, Enter |
| Dagbriefing hardop | Het luidsprekertje rechtsboven |
| "Hey BOB" aanzetten | Het tandwiel rechtsboven |
| Alles stoppen | `Esc` |

De eerste keer vraagt je browser toestemming voor de microfoon. Sta dat toe,
anders werkt alleen typen.

---

## Stap 4 — Het brein (Claude)

Zonder deze stap toont BOB je data, maar kan hij geen vragen beantwoorden.

1. Ga naar <https://console.anthropic.com> → **API Keys** → nieuwe sleutel.
2. Zet in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5
```

Modellen: `claude-opus-5` is het slimst, `claude-sonnet-5` is snel en
goedkoper (prima voor dagelijks gebruik), `claude-haiku-4-5-20251001` is het
goedkoopst.

Herstart BOB. Het label op de assistent-kaart springt van "geen API-key" naar
"klaar".

---

## Stap 5 — Todoist

De makkelijkste connector: één token, geen OAuth.

1. Todoist → **Instellingen** → **Integraties** → tabblad **Ontwikkelaar**.
2. Kopieer je API-token.
3. In `.env`: `TODOIST_API_TOKEN=...`
4. Herstart BOB.

Je kunt taken nu ook direct vanuit het dashboard afvinken.

---

## Stap 6 — Google (Agenda + Gmail)

Dit is de bewerkelijkste stap, maar je doet hem één keer.

1. Ga naar <https://console.cloud.google.com> en maak een project
   (bijvoorbeeld "BOB").
2. **APIs & Services → Library**: zet **Google Calendar API** en **Gmail API** aan.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - Vul naam en je eigen e-mailadres in
   - Bij **Test users**: voeg je eigen Google-accounts toe (alle accounts
     waarvan je de agenda wilt zien)
   - Publiceren hoeft niet — testmodus is genoeg voor eigen gebruik
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:4321/oauth/google/callback`
5. Zet client-ID en secret in `.env`, herstart BOB.
6. Open <http://localhost:4321/oauth/google/start> en log in.

BOB leest **alle** agenda's van dat account, niet alleen de primaire. Heb je
meerdere Google-accounts, dan koppel je er nu één; voor de andere kun je hun
agenda's delen met het gekoppelde account.

BOB vraagt alleen **leesrechten** (`calendar.readonly`, `gmail.readonly`).
Hij kan niets versturen of verwijderen, ook niet per ongeluk.

---

## Stap 7 — Outlook (Microsoft)

Er zijn twee routes. **Neem de eerste** tenzij je een reden hebt voor de tweede.

### Route A — zonder client secret (aanbevolen)

Je hebt alleen je client-ID nodig. Geen secret die je op het juiste moment
moet kopiëren, die verkeerd geplakt kan worden of over een jaar verloopt.

1. [entra.microsoft.com](https://entra.microsoft.com) → **App registrations**
   → **New registration**. Naam: BOB. Accounts: *any organizational directory
   and personal Microsoft accounts*. Redirect URI mag je leeg laten.
2. **Authentication** → **Advanced settings** → **Allow public client flows**
   op **Yes**. Dit is de stap die deze route mogelijk maakt.
3. **API permissions** → **Microsoft Graph** → **Delegated**: `User.Read`,
   `Mail.Read`, `Calendars.Read`, `offline_access`.
4. Kopieer de **Application (client) ID** van de Overview-pagina.

```powershell
.\bob set-secret MICROSOFT_CLIENT_ID
.\bob connect-microsoft
```

BOB toont een code. Ga naar de getoonde link, typ de code, log in. Klaar —
dat is de ene extra handeling waarmee je het hele secret-gedoe overslaat.

### Route B — met client secret

Alleen nodig als je organisatie public client flows verbiedt.

Zelfde registratie, maar wél een **Redirect URI** (type Web):
`http://localhost:4321/oauth/microsoft/callback`, en een secret via
**Certificates & secrets** → **New client secret** → kolom **Value** meteen
kopiëren (die is later niet meer op te vragen).

```powershell
.\bob set-secret MICROSOFT_CLIENT_SECRET
.\bob check-microsoft
```

Zegt die groen, open dan `http://localhost:4321/oauth/microsoft/start`.

Krijg je bij beide routes een melding over toestemming van een beheerder, dan
blokkeert je organisatie het. Dat is geen fout in BOB en niet iets om omheen
te werken; gebruik dan een persoonlijk Microsoft-account of laat Outlook weg.

## Stap 8 — WhatsApp (optioneel, lees dit goed)

**Er bestaat geen officiële API voor persoonlijke WhatsApp-accounts.** Deze
koppeling automatiseert WhatsApp Web via een verborgen browser. Gevolgen:

- het kan breken zodra WhatsApp zijn site aanpast;
- het kan in strijd zijn met WhatsApp's gebruiksvoorwaarden;
- je sessie komt lokaal in `.wwebjs_auth/` te staan.

BOB **leest** alleen ongelezen chats. Hij verstuurt nooit iets.

Wil je het toch:

```powershell
set PUPPETEER_SKIP_DOWNLOAD=1
npm.cmd install whatsapp-web.js qrcode-terminal
.\bob connect-whatsapp --akkoord
```

`PUPPETEER_SKIP_DOWNLOAD=1` slaat de download van 150 MB Chromium over; BOB
gebruikt de Chrome of Edge die al op je computer staat. Op een beheerde laptop
is juist die download meestal de reden dat het misgaat. Staat je browser ergens
ongebruikelijks, zet dan `WHATSAPP_BROWSER_PATH=` in `.env`.

Scan de QR-code (WhatsApp → Instellingen → Gekoppelde apparaten), zet daarna
`WHATSAPP_ENABLED=1` in `.env` en herstart.

Lukt het starten van de browser niet, dan is WhatsApp op deze laptop geen
begaanbare route. Er is geen alternatief: een officiële API voor persoonlijke
WhatsApp-accounts bestaat niet. De rest van BOB werkt gewoon zonder.

---

## Stap 9 — Social media (optioneel)

Elk platform wil zijn eigen access token en app-registratie. Zonder token
toont BOB een streepje in plaats van een verzonnen getal — bewust: een
dashboard dat liegt is erger dan een leeg vakje.

Vul in `.env` in wat je hebt: `LINKEDIN_ACCESS_TOKEN`,
`INSTAGRAM_ACCESS_TOKEN`, `FACEBOOK_ACCESS_TOKEN`, `TIKTOK_ACCESS_TOKEN`.

Mijn advies: sla deze stap over tot de rest staat. De opbrengst is klein en
de tokens verlopen vaak.

---

## Stap 10 — BOB in Claude Desktop en Claude Code

Hiermee kan Claude zelf bij je agenda, mail en taken — en kan Claude BOB
hardop laten praten.

```powershell
node scripts/install-mcp.js          # laat zien wat er zou gebeuren
node scripts/install-mcp.js --write  # doet het echt
```

Het script voegt alleen een `bob`-entry toe aan je bestaande config en maakt
eerst een back-up. Je andere MCP-servers blijven staan.

Daarna Claude Desktop herstarten. Je kunt dan vragen als:

> Wat staat er morgen in mijn agenda?
> Lees mijn dagbriefing hardop voor.
> Welke taken staan over tijd?

De gereedschappen die BOB aanbiedt: `bob_agenda`, `bob_mail`, `bob_tasks`,
`bob_complete_task`, `bob_briefing`, `bob_speak`, `bob_status`.

BOB moet wel draaien — de MCP-server praat met `http://localhost:4321`.

Extra servers (filesystem, memory) staan als voorbeeld in
`mcp/claude_desktop_config.example.json`.

---

## Stap 11 — CLAUDE.md invullen

Open `CLAUDE.md` en pas hem aan. Dit is wat BOB over jou weet: je ventures,
hoe je aangesproken wilt worden, welke afkortingen je gebruikt. Elke regel die
je hier zet, hoef je nooit meer uit te leggen.

Dit is de stap met het hoogste rendement per minuut. Doe hem niet als laatste.

---

## Als er iets niet werkt

```powershell
npm run doctor
```

Die loopt alles langs en zegt per onderdeel wat er mis is.

| Symptoom | Oorzaak |
|---|---|
| `npm : running scripts is disabled` | Beleid blokkeert `npm.ps1` — gebruik `bob doctor` of `node scripts/doctor.js` |
| `Cannot find module` / geen package.json | Je staat in de verkeerde map — eerst `cd` naar de BOB-map |
| Dashboard laadt niet | Server draait niet — `bob` starten en kijken naar de meldingen |
| "Geen toegang tot de microfoon" | Sta het toe via het slotje in de adresbalk |
| Wakewoord doet niets | Werkt alleen in Chrome en Edge |
| Cartesia 401 | Sleutel klopt niet of is gerouleerd |
| Cartesia 404 | Voice-ID bestaat niet in dat account |
| Cartesia 400 op het model | `sonic-3.6` bestaat niet meer — check docs.cartesia.ai |
| Claude 404 | Modelnaam veranderd — check platform.claude.com/docs/en/models/overview |
| Google 403 | Je account staat niet bij "Test users" |
| Agenda leeg terwijl er afspraken zijn | Verkeerde Google-account gekoppeld |
| WhatsApp blijft "verbinden" | Sessie verlopen — draai `npm run whatsapp:link` opnieuw |

Poort 4321 al bezet? Zet een andere `PORT=` in `.env`. Vergeet dan niet de
redirect-URI's bij Google en Microsoft mee te veranderen.
