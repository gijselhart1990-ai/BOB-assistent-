---
description: Een tabelwijziging in Xano schrijven en toepassen
argument-hint: [wat er moet veranderen]
---

Wijzig het datamodel voor: $ARGUMENTS

Xano is hier alleen database. Er komt geen endpoint, geen functie en geen
logica in Xano bij — die hoort in `app/api/` of `lib/`.

1. Pas `scripts/xano-tabellen.mjs` aan: de tabeldefinitie of het schema. Dat
   script is de enige plek waar het datamodel staat, zodat elke wijziging in de
   repo terug te lezen is.
2. Komt er een tabel bij, zet er dan ook een `XANO_TABLE_*` regel bij in
   `.env.example`, in `lib/env.ts` en in de tabel in SETUP.md.
3. Bedenk wat er met bestaande rijen gebeurt. Een veld weghalen is
   onomkeerbaar — zeg dat erbij in plaats van het te doen.
4. Toon wat er verandert en vraag om akkoord vóór je
   `node scripts/xano-tabellen.mjs --maak` draait.
5. Onthoud dat bijwerken in Xano een PUT is die de rij vervangt: code die het
   nieuwe veld schrijft moet de bestaande rij meegeven aan `werkBij`, of
   `werkVeldBij` gebruiken.
