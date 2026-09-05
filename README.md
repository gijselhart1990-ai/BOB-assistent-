# BOB

Sanders persoonlijke assistent. Draait volledig op zijn eigen computer:
één dashboard voor agenda, mail, taken en berichten, met een stem die
antwoordt en een brein dat de vragen begrijpt.

```
  Browser (localhost:4321)
        │
        ├── dashboard ──── panelen: agenda · mail · taken · WhatsApp · social
        │
        └── stem ───────── spatiebalk ingedrukt → opname
                                │
  ┌─────────────────────────────┴──────────────────────────────┐
  │  BOB-server (Node.js, alleen bereikbaar vanaf deze machine) │
  └──┬──────────┬───────────┬────────────┬─────────────┬────────┘
     │          │           │            │             │
  Cartesia   Claude      Google      Microsoft      Todoist
  stem in    brein     Agenda+Gmail   Outlook        taken
  en uit
```

Alle API-sleutels staan in `.env` op de server. De browser krijgt ze nooit te
zien; hij krijgt alleen audio en tekst terug.

## Snel starten

```powershell
.\install-bob.ps1     # eenmalig
.\start-bob.ps1       # elke keer
```

Volledige uitleg per connector: **[INSTALL.md](INSTALL.md)**.

## Wat het doet

**Dashboard** — agenda uit alle Google-kalenders én Outlook door elkaar op
tijd, ongelezen mail uit beide, Todoist-taken die je direct afvinkt, WhatsApp
en social. Ververst zichzelf elke drie minuten.

**Stem** — spatiebalk ingedrukt houden, praten, loslaten. Je woorden gaan naar
Cartesia's `ink-whisper`, het antwoord komt terug in jouw eigen stem via
`sonic-3.6`. Optioneel wakewoord "Hey BOB" (Chrome en Edge).

**Brein** — Claude krijgt bij elke vraag je actuele agenda, mail en taken mee,
plus wat er in `CLAUDE.md` staat. Daarom werkt "wat moet ik vandaag als eerste
doen" gewoon, zonder dat je iets hoeft uit te leggen.

**Opdrachten** — geef BOB een zelfstandige opdracht in het paneel Opdrachten
of spreek hem uit: “onderzoek …”, “lees …”, “onthoud dat …” of “maak
Todoist-taak: …”. BOB toont elke stap, bewaart zijn resultaat lokaal en leest
een resultaat voor wanneer je op **Lees voor** drukt. Onderzoek zoekt bronnen,
leest de best bereikbare pagina's en maakt er een bronvermelde samenvatting van.

**Veilige autonomie** — lokale, omkeerbare opdrachten (onderzoek, uitwerken,
briefing en geheugen) starten automatisch. Een wijziging buiten BOB gebeurt
alleen wanneer je die concreet opdraagt. Een afspraak wijzigen, mail versturen
of een bericht versturen zit niet in deze versie; de gekoppelde mail- en
agendarechten blijven read-only.

**MCP** — BOB is óók een MCP-server. Na `node scripts/install-mcp.js --write`
kan Claude Desktop en Claude Code rechtstreeks bij je agenda, mail en taken, en
kan Claude BOB hardop laten praten.

## Bestanden

| Pad | Wat |
|---|---|
| `CLAUDE.md` | Wat BOB over jou weet. Het bestand met het meeste rendement. |
| `.env` | Sleutels en instellingen. Staat in `.gitignore`. |
| `server/` | Express-server, connectoren, Cartesia- en Claude-koppeling |
| `server/services/agent.js` | Opdrachtwachtrij, webonderzoek en auditlog |
| `server/services/memory.js` | Lokaal geheugen dat BOB bij elk gesprek gebruikt |
| `public/` | Het dashboard — één HTML, één CSS, twee JS-modules |
| `mcp/` | BOB als MCP-server voor Claude Desktop en Claude Code |
| `scripts/doctor.js` | `npm run doctor` — zegt per onderdeel wat er mis is |
| `data/` | Tokens en gespreksgeschiedenis. Blijft lokaal. |

## Zelfstandig werken

BOB bewaart opdrachten in `data/missions.json`, zijn zichtbare actielog in
`data/activity.json` en onthouden feiten in `data/memory.json`. Die bestanden
blijven lokaal en staan in `.gitignore`. Zet `BOB_AUTOPILOT=0` in `.env` als je
opdrachten eerst handmatig vanuit het dashboard wilt starten. Standaard staat
de veilige autopilot aan.

## Uitgangspunten

**Halve installatie is een werkende installatie.** Elke connector faalt op
zichzelf. Geen Todoist-token? Dan staat er "niet verbonden" op die ene kaart en
werkt de rest gewoon.

**Nooit verzonnen data.** Als een bron niets teruggeeft, zegt BOB dat. Geen
placeholder-getallen die eruitzien als echte cijfers. Demomodus (`BOB_DEMO=1`)
is de enige uitzondering en zet er een gele waarschuwingsbalk bij.

**Lokaal, tenzij.** De server luistert alleen op `127.0.0.1`. Je agenda en mail
verlaten je machine alleen richting de API's die je zelf gekoppeld hebt.

**Alleen lezen.** De OAuth-scopes zijn read-only. BOB kan geen mail versturen
en geen afspraken verzetten. Het enige wat hij verandert is een Todoist-taak
afvinken, en dat alleen als jij op het vinkje klikt.

## Bekende beperkingen

- **WhatsApp** loopt via een onofficiële bridge. Kan breken, kan tegen de
  voorwaarden ingaan. Zie stap 8 in INSTALL.md.
- **Social-tellers** vragen per platform een eigen token en app-registratie.
  Zonder token blijft het vakje leeg.
- **Wakewoord** gebruikt de spraakherkenning van de browser en werkt daarom
  alleen in Chrome en Edge.
- **Eén Google-account tegelijk.** Voor meerdere accounts: deel hun agenda's
  met het gekoppelde account.
