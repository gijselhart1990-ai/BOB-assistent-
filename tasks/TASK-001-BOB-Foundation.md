# TASK-001 — BOB Foundation

Status: basis aanwezig; geen productiecertificering.

Doel: persoonlijke cockpit met expliciete toegang en gecontroleerde acties.
De modules en plancontracten staan in lib/foundation. De actuele scope staat in
[MASTER-SPEC](../docs/MASTER-SPEC.md).

Acceptatie van deze basis:
- Alleen toegestane gebruikers krijgen toegang; vervallen tokens falen.
- Onbekende acties vragen akkoord; tekstwaarden kunnen geen toestemming geven.
- Verlopen of afgehandelde opdrachten kunnen niet alsnog worden goedgekeurd.
- Gelijktijdige pollers claimen een opdracht maximaal eenmaal.
- Ontbrekende duurzame opslag geeft een expliciete fout.

Geautomatiseerde dekking: tests/test-sessie.ts, tests/test-foundation.ts en
tests/regressions.test.ts. Live acceptatie volgt in TASK-003.
