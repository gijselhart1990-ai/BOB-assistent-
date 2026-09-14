# TASK-002 — Developer Foundation

Status: uitgewerkt in onderhoudsbranch.

Doel: reproduceerbaar onderhouden zonder tegenstrijdige architectuurclaims.

Acceptatie:
- Tests staan in tests; scripts blijven beheerhulpmiddelen.
- Geen lege shellrestbestanden of gegenereerde logs in de hoofdmap.
- README verwijst naar actuele architectuur, specificatie, handbook en taken.
- Eén verify-commando voert lint, typecontrole, tests en build uit.
- CI gebruikt dezelfde stappen en de vereiste Node-versie.
- Afhankelijkheden staan vast via package-lock; updates komen ter beoordeling als PR.

Bewijs: de lokale verificatie en GitHub Actions van de bijbehorende pull request.
