---
description: Voeg een nieuw scherm toe in de bestaande stijl
argument-hint: [naam van het scherm]
---

Maak een nieuw scherm: $ARGUMENTS

Volg de opbouw van de bestaande schermen in `app/(dash)/`:

- `SchermKop` bovenaan met een gekleurd icoon, titel, ondertitel en citaat
- de inhoud in `.cols cols-<naam>` kolommen (voeg de grid toe in `app/globals.css`)
- rechts een `BobRail` met een opdracht, vier actiekaarten en chips
- `SchermVoet` onderaan
- data via `useApi('/api/...')`, met een echte lege staat en `NietGekoppeld` als de bron er niet is

Zet het scherm ook in `NAV` en `PLAATSHOUDER` in `components/Shell.tsx`.

Verzin geen data. Is een bron niet beschikbaar, dan zegt het scherm dat.
