# BOB

Sanders persoonlijke assistent, als privéwebsite. Eén dashboard voor agenda,
mail, taken, WhatsApp en het web, met een brein dat de vragen begrijpt en een
stem die antwoordt.

Alles staat dicht: één toegangslijst met één adres erop.

```
  Browser  ──  jij, ingelogd via een e-maillink
      │
      ▼
  Netlify  ──  Next.js (schermen + API-routes)
      │
      ├── Xano ─────────────────────  tokens · gesprekken · instellingen
      │
      ├── Netlify Blobs ────────────  wachtrij · hartslag · gebruikte inloglinks
      │
      ├── Google · Microsoft · Todoist · Brave · Claude · Cartesia
      │
      └── wachtrij  ◀──  BOB-bridge op je laptop
                         browservenster · WhatsApp Web
```

Toegang zit niet in een dienst maar in twee omgevingsvariabelen: een geheim
waarmee je sessiecookie wordt ondertekend, en een lijst met wie er binnen mag.
Geen wachtwoorden, dus niets om te lekken.

## Waarom twee opslagplaatsen

Xano is de database: tokens, gesprekken, instellingen. Alleen tabellen — alle
logica staat in deze repo, zodat je op één plek kunt lezen wat er gebeurt.

De wachtrij naar je laptop staat er bewust naast, in Netlify Blobs. Het gratis
plan van Xano doet tien verzoeken per twintig seconden en je laptop vraagt elke
seconde of er werk is; dat past niet. Blobs hoort bij de site en kost niets
extra.

## Waarom die brug

Netlify draait serverless. Prima voor API-aanroepen, maar een browservenster
dat urenlang openstaat en een WhatsApp-sessie passen daar niet in. Je laptop
kan dat wel, maar is van buitenaf niet bereikbaar.

Dus draait het verkeer om: de site zet een opdracht in de wachtrij, je laptop
vraagt elke seconde of er werk is. Geen open poort, geen port forwarding,
niets te configureren op je router. Staat je laptop uit, dan zegt het dashboard
dat — in plaats van te blijven wachten op iets wat niet gaat gebeuren.

## Schermen

Vandaag · Mail · Outlook · WhatsApp · Koppelen · Google Workspace ·
Social Media · Web Assistent · Instellingen

Elk scherm heeft rechts een Bob-paneel dat met de gegevens van dát scherm
meedenkt. De knoppen sturen een echte vraag; het antwoord verschijnt ernaast.

## Uitgangspunten

**Nooit verzonnen data.** Geeft een bron niets terug, dan staat dat er. Geen
placeholder-cijfers die eruitzien als echte cijfers.

**Wat een website zegt is informatie, geen opdracht.** Alles wat BOB van het web
leest komt gemarkeerd binnen, en zijn instructies zeggen dat hij daar nooit
opdrachten uit opvolgt. Probeert een pagina het toch, dan hoor je dat van hem.

**Lezen mag, handelen vraagt akkoord.** Zoeken, lezen en navigeren gaan direct.
Klikken, typen en toetsen indrukken zetten een vraag in je dashboard — elke keer
opnieuw, want anders is je eerste ja een blanco cheque.

**Nooit wachtwoorden of betaalgegevens.** Geen instelling, een grens in de code.

**Zo min mogelijk gegevens.** Van je mail worden alleen afzender, onderwerp en
tijd opgehaald. Van WhatsApp alleen wie er wacht en hoeveel. De inhoud blijft
waar hij hoort.

**Twee grendels.** Een geldige sessie is niet genoeg; je adres moet ook op de
toegangslijst staan. En een inloglink werkt één keer: hij is tien minuten
geldig en de tweede klik ketst af.

## Aan de slag

Zie **[SETUP.md](SETUP.md)** — van lege repo tot werkende site, stap voor stap.

```bash
npm install
cp .env.example .env.local     # invullen
npm run dev
```

```bash
npm run verify                 # typecheck + build; dit moet slagen voor je pusht
```

## Bestanden

| Pad | Wat |
|---|---|
| `app/(dash)/` | de schermen |
| `app/api/` | de backend |
| `components/` | Shell, BobRail, iconen |
| `lib/connectors/` | Google, Microsoft, Todoist, social |
| `lib/ai/` | systeemprompt en gereedschapslus |
| `lib/bridge.ts` | opdrachten naar je laptop |
| `bridge/` | het programma dat daar draait |
| `lib/xano.ts` | de database, meer niet |
| `lib/session.ts` | sessiecookies en inloglinks |
| `scripts/xano-tabellen.mjs` | de vier tabellen aanmaken of controleren |
| `scripts/env-doctor.mjs` | `npm run env` — elke sleutel testen |
| `SLEUTELS.md` | hoe je alle sleutels vervangt als er een gelekt is |
| `app/globals.css` | het hele ontwerp, één bestand |
| `CLAUDE.md` | context voor Claude Code |

## Bekende grenzen

- **Browseracties en WhatsApp werken alleen als je laptop aanstaat.** Dat is de
  prijs van berichten die je machine niet verlaten.
- **Social-tellers** vragen per platform een eigen app-registratie. Zonder token
  staat er een streepje.
- **Drive en Foto's** worden niet uitgelezen: dat zou extra machtigingen vragen
  die BOB niet nodig heeft.
- **Xano's gratis plan** doet tien verzoeken per twintig seconden en 100.000
  records. Voor één gebruiker ruim voldoende; de wachtrij staat er juist
  daarom naast.
- **De inloglink heeft een mailer nodig** (Resend of SendGrid). Zolang die er
  niet is, log je in met `BOB_LOGIN_CODE`.
