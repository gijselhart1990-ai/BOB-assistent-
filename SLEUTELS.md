# Sleutels vervangen

Deze lijst hoort erbij als een sleutel gelekt is — in een repo, in een chat,
in een screenshot. Werk hem van boven naar beneden af. Elke regel is: nieuwe
maken, in `.env` zetten, oude intrekken. **In die volgorde**, anders ligt er
iets stil tussen die twee stappen in.

Controleer na elke paar regels met:

```bash
npm run env
```

Dat belt elke dienst één keer op en zegt per sleutel of hij werkt. Er wordt
nooit een sleutel afgedrukt — alleen de eerste en laatste vier tekens — dus
die uitvoer kun je veilig delen.

---

## 0. Eerst: een verse .env

```bash
npm run env -- --nieuw
```

De oude wordt bewaard als `.env.oud-…` (staat in `.gitignore`, gaat nooit mee
in een commit). `BOB_SESSION_SECRET` en `BOB_LOGIN_CODE` worden hierbij op je
eigen machine aangemaakt en zijn nergens anders geweest.

Verwijder het oude bestand zodra alles werkt.

---

## 1. Anthropic — het brein

[console.anthropic.com → API Keys](https://console.anthropic.com/settings/keys)

Create Key, plak hem bij `ANTHROPIC_API_KEY`, en **revoke** daarna de oude.
Deze staat bovenaan omdat hij geld kost: een gelekte sleutel die iemand vindt,
wordt gebruikt.

## 2. Xano — de database

[app.xano.com → Account → Metadata API](https://app.xano.com)

Nieuw token met precies deze twee scopes:

- Workspace Content: **Read/Write**
- Workspace Database: **Read/Write**

Naar `XANO_METADATA_TOKEN`; oude intrekken. Trek meteen ook het
apispec-token in als je dat ergens hebt gedeeld — dat is een aparte.

## 3. Google — Agenda en Gmail

[console.cloud.google.com → Credentials](https://console.cloud.google.com/apis/credentials)

Open je OAuth-client (Web application). **Add secret**, plak de nieuwe bij
`GOOGLE_CLIENT_SECRET`, en verwijder de oude pas als het dashboard weer
koppelt. De client-ID blijft hetzelfde.

Controleer terwijl je er toch bent de redirect-URI:

```
https://JOUW-SITE.netlify.app/api/oauth/google/callback
```

Na het vervangen moet je in het dashboard éénmalig opnieuw op **Koppelen**
klikken: de opgeslagen refresh-token hoort bij het oude secret.

## 4. Microsoft — Outlook

[entra.microsoft.com → App registrations](https://entra.microsoft.com)

Certificates & secrets → New client secret → naar `MICROSOFT_CLIENT_SECRET`,
oude verwijderen.

Twee dingen om meteen na te lopen nu je er bent:

- Redirect-URI: `https://JOUW-SITE.netlify.app/api/oauth/microsoft/callback`
- API permissions: `User.Read`, `Mail.Read`, `Calendars.Read` — **Delegated**.
  Staan er application-rechten? Weghalen. Die geven je app toegang tot de hele
  tenant, en dat heeft BOB niet nodig.

Ook hier: daarna opnieuw koppelen in het dashboard.

## 5. Cartesia — de stem

[play.cartesia.ai → API Keys](https://play.cartesia.ai)

Nieuwe sleutel naar `CARTESIA_API_KEY`, oude intrekken. `CARTESIA_VOICE_ID`
blijft hetzelfde; `npm run env` controleert of die stem in je account bestaat.

## 6. Todoist

[todoist.com → Settings → Integrations → Developer](https://app.todoist.com/app/settings/integrations/developer)

Dit is één vast API-token per account. **Reset API token** maakt een nieuwe en
maakt de oude meteen ongeldig — alles wat de oude gebruikt stopt dus op dat
moment. Nieuwe naar `TODOIST_API_TOKEN`.

## 7. Brave Search

[api-dashboard.search.brave.com](https://api-dashboard.search.brave.com/app/keys)

Nieuwe key naar `BRAVE_API_KEY`, oude weg.

## 8. Resend — de inloglink versturen

[resend.com/api-keys](https://resend.com/api-keys)

Naar `RESEND_API_KEY`. Zolang je geen eigen domein hebt geverifieerd blijft
`BOB_MAIL_FROM` op `onboarding@resend.dev` staan — daarmee mag je alleen naar
het adres van je eigen Resend-account mailen. Voor één gebruiker is dat
precies genoeg.

## 9. Het bridge-token

Dat zit niet in `.env`. Maak een nieuwe in het dashboard onder
**Instellingen → Je laptop**, en zet hem in `bridge\.env` op je laptop. Van
het oude token staat alleen een hash in Xano; die rij kun je daar weggooien.

---

## Daarna: Netlify bijwerken

```bash
npm run env -- --netlify
```

Dat drukt een blok af dat je in één keer kunt plakken bij **Site configuration
→ Environment variables → Import from a .env file**. Zet
`NEXT_PUBLIC_SITE_URL` daar op je echte adres, niet op `localhost`.

Trigger daarna **Deploys → Trigger deploy → Clear cache and deploy**. Netlify
leest omgevingsvariabelen bij het bouwen, dus zonder nieuwe deploy verandert
er niets.

---

## Wat je hierna nooit meer doet

- Een sleutel in een chat, ticket of screenshot plakken. Ook niet "even".
- Bestanden via de web-uploader van GitHub toevoegen: die negeert
  `.gitignore`, en zo kwam `.env` de eerste keer in de repo.
- Een `.env.oud-…` laten slingeren nadat alles werkt.
