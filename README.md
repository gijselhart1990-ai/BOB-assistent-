# BOB — persoonlijke assistent

Een persoonlijk Next.js-dashboard voor agenda, mail, taken, WhatsApp en AI-assistentie.
De repository bevat werkende bouwstenen en Foundation-schermen. Live koppelingen
vereisen configuratie en acceptatietests; toekomstige modules zijn niet productiegereed.

## Starten

Gebruik Node.js 22.12 of hoger.

```sh
npm ci
npm run dev
```

Kopieer eerst .env.example naar .env.local en vul de benodigde waarden in.
De interface kan lokaal starten; inloggen en bridge-functies vereisen duurzame
Redis-opslag via Vercel Marketplace. Gebruik een afzonderlijke testdatabase.

## Controleren

```sh
npm run verify
npm audit
```

Verify voert lint, typecontrole, tests en productiebuild uit zonder echte
providers aan te roepen. Unit tests gebruiken uitsluitend testgegevens.
De laptopbridge is een apart Node-project in bridge/.

## Wegwijzer

| Document | Inhoud |
|---|---|
| [Master Spec](docs/MASTER-SPEC.md) | Huidige scope en acceptatie |
| [Architectuur](docs/ARCHITECTURE.md) | Werkelijke lagen en opslag |
| [Engineering Handbook](docs/ENGINEERING-HANDBOOK.md) | Structuur, ontwikkelen en review |
| [Taken](tasks/README.md) | Concrete bouw- en acceptatieopdrachten |
| [Deployment](docs/DEPLOYMENT.md) | Vercel, Redis en runtimevoorwaarden |
| [Roadmap](docs/ROADMAP.md) | Toekomstige modules en productievereisten |
| [Setup](SETUP.md) | Uitgebreide configuratiehandleiding |
| [Sleutels vervangen](SLEUTELS.md) | Rotatie van credentials |

## Huidige grenzen

Xano bewaart tokens, berichten en instellingen. Redis via Vercel Marketplace bewaart de wachtrij,
hartslag, gebruikte inloglinks en inlogpogingen. Een laptopproces verzorgt browser
 en WhatsApp; dat werkt alleen als de laptop en bridge beschikbaar zijn.

Google/Microsoft gebruiken de bestaande leesscopes. Toegang wordt gecontroleerd
via ondertekende sessies en een e-mailtoegangslijst. Browsermutaties vragen per
opdracht akkoord. Ontbrekende opslag geeft een fout en wordt niet overgeslagen.

Foundation-plannen zijn geen uitvoerende workflowengine. Rollen, volledige audit,
SnelStart en multi-tenant opslag blijven vervolgwerk. Zie TASK-003 voor live acceptatie.
