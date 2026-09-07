# BOB — Infrastructuur en implementatieplan v1

Status: ontwerp ter review, 7 september 2026. Geen productie-uitrol of goedgekeurde security-audit. Eigenaar: Stand Up Zorg.

## 1. Uitgangspunt en bestaande situatie

Het bestaande BOB-project wordt niet opnieuw gebouwd. De repository BOB-assistent- bevat Next.js 15, Netlify-configuratie, Xano-opslag, Netlify Blobs, Google/Microsoft-connectoren, een lokale bridge, Claude/Cartesia en CI. Deze onderdelen zijn geïnventariseerd op basis van README, SETUP, package.json en ci.yml. De runtime, cloudinstellingen en feitelijke beveiliging zijn niet getest. Behoud de bestaande interface en referentiebeelden. Een wijziging van hosting of database is geen voorwaarde om het ontwerp te starten.

De bestaande documentatie bevat aannames die eerst moeten worden gecontroleerd: alleen een ondertekend cookie is geen volledige sessie-intrekking; een token in een database is niet vanzelf versleuteld; een outbound polling-bridge is niet vanzelf veilig; en een code of e-maillink levert niet automatisch een sterke identiteit voor gevoelige handelingen. Ook zijn bestaande claims over gratis limieten, kosten en API-ondersteuning geen geverifieerde productiegaranties.

## 2. Beslissingen

- ADR-001: Bestaande Netlify/Next.js/Xano-stack voorlopig behouden. Geen big-bangmigratie naar Vercel/PostgreSQL.
- ADR-002: BOB Core wordt een modulaire TypeScript-backend met expliciete grenzen voor gateway, orchestrator, workflows, policies, connectors, audit en interactie. Eerst binnen bestaande code structureren; later kunnen modules worden uitgeplaatst.
- ADR-003: Een aparte persistente worker en managed PostgreSQL zijn de doelarchitectuur voor betrouwbare workflowuitvoering en audit. Leverancier en migratiemoment blijven open totdat de huidige data, kosten en risico's zijn onderzocht.
- ADR-004: Bestaande lokale bridge behouden maar in de eerste productiefase geen onbeperkte laptopbesturing. Alleen expliciet toegestane capabilities en een apart beveiligingsonderzoek.
- ADR-005: Development, staging en productie krijgen aparte credentials, opslag en deployrechten. Geen echte cliëntgegevens in development, CI of publieke previews.
- ADR-006: Default deny en server-side autorisatie. AI, UI en MCP-tools mogen geen uitvoeringsvergunningen zelf uitgeven.

## 3. Doelarchitectuur

Browser/voice -> Next.js frontend -> authenticated API gateway -> orchestrator -> workflow engine -> policy engine -> integration hub -> externe APIs.

De workflow engine gebruikt persistente opslag en een worker. Een transactional outbox verbindt lokale statuswijzigingen met betrouwbare eventverwerking. Externe writes krijgen een idempotency key en reconciliatie bij een onzekere uitkomst. Audit, tracing en notificaties zijn afzonderlijke services met eigen rechten. De frontend ontvangt uitsluitend gevalideerde status- en navigatie-events.

Voor de MVP mogen API en frontend op dezelfde hosting draaien zolang server-only grenzen, time-outs en autorisatie kloppen. Langlopende jobs, browserprocessen en persistente voiceverbindingen worden niet zonder verificatie in kortlevende serverless-functies ondergebracht.

## 4. Repositorystructuur (doel, gefaseerd)

```text
BOB-assistent-/
  apps/
    web/                  # bestaande dashboardcode, gefaseerd verplaatsen
    api/                  # toekomstige afzonderlijke API
    worker/               # persistente job-uitvoering
  packages/
    contracts/            # schema's, events en foutcodes
    core/                 # orchestrator, workflow, policy
    connectors/           # Google, Microsoft, later Exact
    observability/        # auditcontracten en tracing
    ui/                   # gedeelde UI, zonder secrets
  bridge/                 # bestaande lokale agent, geïsoleerd
  infra/
    environments/         # niet-geheime configuratie
    migrations/           # versiebeheer voor datamigraties
  docs/
    01-architectuur/
    02-wireframes/
    03-integraties/
    04-security/
    05-flows/
    decisions/
  .github/workflows/
```

Dit is geen opdracht om vandaag bestaande paden te verplaatsen. De eerste codewijziging mag alleen nieuwe modules toevoegen of bestaande componenten veilig inkapselen. Eerst tests, dan kleine migraties met een rollback.

## 5. Omgevingen

Development: lokaal, synthetische data, mockconnectoren, geen productie-OAuth. Staging: afgeschermde testomgeving met afzonderlijke testaccounts, eigen database, beperkte credentials en geen echte cliëntdata. Production: afzonderlijke hosting en opslag, MFA, minimale rollen, gecontroleerde deploys en eigen secrets.

Een preview krijgt nooit automatisch productiesecrets of brede toegang tot productiegegevens. Voor OAuth worden per omgeving afzonderlijke redirect-URI's, state/PKCE, tokenopslag en scopeprofielen ingericht. Productiedata mag alleen na een afzonderlijk goedgekeurde, geminimaliseerde testprocedure worden gebruikt.

## 6. Secrets en authenticatie

Alle secrets blijven buiten Git, clientbundles, prompts en logs. Gebruik een beheerde secret manager en aparte runtime-identiteiten. OAuth refresh tokens worden met een beheerde sleutel versleuteld opgeslagen en zijn alleen toegankelijk voor de betreffende connector. Sleutelrotatie, intrekking en herstel worden getest. Een .env.example bevat uitsluitend namen en onbruikbare voorbeeldwaarden.

Controleer bestaande loginlinks, sessiecookies, CSRF-bescherming, rate limits, tokenintrekking, sessieverval, MFA en account recovery. Een allowlist is aanvullend op authenticatie, geen vervanging ervan. E-mailcodefallback en permanente bridge-tokens moeten worden herbeoordeeld vóór gebruik met gevoelige informatie. De bridge krijgt een eigen identiteit, korte/roteerbare credentials, capability-allowlist en server-side controle op iedere opdracht.

## 7. Database en workflows

Doel: managed PostgreSQL, Prisma-migraties, gescheiden rollen voor applicatie, migraties en audit. Tabellen omvatten users, organizations, memberships, connected_accounts, encrypted_credentials, workflow_runs, workflow_steps, action_requests, approvals, execution_attempts, outbox_events, audit_events en notifications.

Elke rij met zakelijke context heeft expliciete organisatie- en autorisatiegrenzen. Geen directe databasequery vanuit AI of frontend. Definieer unieke constraints voor idempotency keys en geldige statusovergangen. Audit is append-only op applicatieniveau, met aanvullende opslagintegriteit en een apart bewaarbeleid. Bewaar broninhoud alleen wanneer noodzakelijk en met een vastgesteld doel en termijn.

Migreer Xano niet voordat export, datamapping, versleuteling, back-up, herstel, referentiële integriteit en rollback zijn getest. Er worden in deze fase geen productietabellen verwijderd of gewijzigd.

## 8. Workers en realtime

De worker claimt taken atomair via een betrouwbare queue, met leases, time-outs, beperkte retries en dead-letter-afhandeling. Een verlopen lease mag niet tot dubbele externe uitvoering leiden. De backend verifieert na een onzekere API-uitkomst eerst de externe status. De browser ontvangt realtime events via SSE of WebSocket; keuze volgt uit concrete voice- en hostingvereisten. Eventstreaming is nooit een bron van uitvoeringsrechten.

## 9. CI/CD en releasebeheer

Bestaande CI wordt behouden en uitgebreid. Pull requests krijgen minimaal lint, typecheck, unit/integratietests, build, dependency-audit, secretscan en migratievalidatie. Geen echte cloudsecrets in CI. Gebruik minimale GitHub Actions-permissions, vastgepinde third-party actions waar passend en gecontroleerde dependency-updates. Main is beschermd; merge vereist review en geslaagde checks. Production deployt alleen vanuit een goedgekeurde release met omgevingsgoedkeuring. Geen automatische productiemigratie zonder apart plan.

Een rollback herstelt de vorige applicatieversie en veilige configuratie. Databasewijzigingen volgen expand-migrate-contract, zodat oude en nieuwe code tijdelijk naast elkaar kunnen werken. Back-ups worden versleuteld, buiten de primaire foutdomeingrens bewaard en periodiek daadwerkelijk teruggezet in een testomgeving. RPO en RTO worden vóór productie vastgesteld en getest.

## 10. Observability en kosten

Gebruik OpenTelemetry voor correlatie, traces en metrics; een geschikte centrale log-/foutbackend en een aparte auditstore. Verwijder tokens, mailinhoud, ruwe audio en cliëntgegevens uit technische logs. Monitor foutpercentages, latency, queue-leeftijd, connectorlimieten, uitgaven, tokenverval en onbekende externe uitkomsten. Budgetlimieten en alerts per AI-, voice-, hosting- en API-dienst. Geen onbeperkte autonome tool-lussen.

## 11. Eerstvolgende uitvoeringsfase

Fase 0: repository en werkelijke deployments inventariseren; veiligheidsrisico's vastleggen; huidige site niet wijzigen. Fase 1: contracten, policy en mockconnectoren toevoegen, met tests. Fase 2: persistente workflow, audit en outbox in een afgeschermde omgeving. Fase 3: dagstart met synthetische data end-to-end. Fase 4: Google OAuth met minimale leesrechten en een zakelijk testaccount. Fase 5: gecontroleerde concept- en schrijfacties met specifieke toestemming. Fase 6: pas na aparte beoordeling cliëntgegevens, facturering, WhatsApp en laptopbesturing.

## 12. Acceptatie voor de eerste technische milestone

- Bestaande site en interface blijven intact.
- Synthetische dagstart loopt via gateway, policy, mockconnector en workflow.
- Iedere stap heeft een correlation-ID en herleidbare audit.
- Onbekende capability en ontbrekende rechten leiden tot DENY.
- Geen externe schrijf- of laptopactie is mogelijk in de eerste milestone.
- CI slaagt en er zijn geen echte secrets of cliëntgegevens in code, tests of previews.
- Een workerfout kan veilig worden hervat zonder dubbele uitvoering.
- Backup/restore en rollback zijn aantoonbaar getest vóór productiegebruik.

## 13. Openstaande besluiten

Werkelijke Netlify/Xano-deployments en kosten; huidige encryptie van OAuth-tokens; bestaande bridgebeveiliging; keuze managed PostgreSQL en workerhosting; exacte wettelijke/contractuele bewaartermijnen; DPIA en verwerkersafspraken waar vereist; voiceprovider en verwerkingslocatie; Google Workspace-accounttype en beschikbare OAuth-scopes; keuze voor toekomstige desktopbesturing.

Geen van deze openstaande punten mag worden ingevuld met aannames over de huidige configuratie. Bevestiging volgt uit repositoryreview, providerinstellingen en gerichte tests.
