# Roadmap BOB 1.0

## Fase 0 — Foundation (nu)

- Dashboardcockpit, centrale BOB en responsieve modules.
- Modulecatalogus, basis-orchestrator, policycontract en workflowdefinities.
- Takenhub-, Administratie-, Workflow- en Security-schermen.
- Documentatie voor architectuur, integraties, deployment en beveiliging.
- Demo-safe: geen echte klantdata en geen autonome impactacties.

## Fase 1 — Veilige kern

- PostgreSQL-schema, tenantisolatie en migraties.
- Auth.js/Entra of gelijkwaardige productieauthenticatie met rollen.
- Approval Hub met payloadhash, vervaltijd en aanpassen/annuleren.
- Volledig auditlog, observability, rate limiting en noodstop.
- Orchestrator met typed tool contracts en testbare policy gates.

## Fase 2 — Productieve koppelingen

- Microsoft 365-accountmanager en aparte read/write-consent.
- Google multi-accountmanager.
- Takenhub-sync en conflictregels.
- SnelStart sandbox: klanten/artikelen lezen en conceptfactuur maken.
- Persistente worker/queue voor langdurige processen.

## Fase 3 — Workflow Builder

- Visuele editor, validatie, draft/publiceerflow en versies.
- Retries, compensatiestappen, planning en notificaties.
- Herbruikbare templates voor dagbriefing, mailtriage en facturering.

## Fase 4 — Pilot Stand Up Zorg

- Test met fictieve data, daarna beperkte pilotdata.
- DPIA, verwerkersafspraken, bewaartermijnen en rechtencontrole.
- Acceptatietesten per workflow en herstelproeven.
- Pas na formele go/no-go: productiegebruik en gefaseerde uitbreiding.

## Definition of Done per koppeling

OAuth/scopes, tenantisolatie, foutafhandeling, idempotency, approval gate, audit, intrekken van toegang, tests en beheerhandleiding zijn aantoonbaar gereed.
