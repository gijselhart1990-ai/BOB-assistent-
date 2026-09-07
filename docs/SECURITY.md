# Securitymodel

## Niet-onderhandelbare regels

- Deny-by-default en least privilege.
- Geen API-sleutels, OAuth-tokens, cliëntdata of medische gegevens in clientcode, Git, prompts of logs.
- Geen impactactie zonder een expliciete, actuele en payloadgebonden goedkeuring.
- Geen stille accountkeuze bij meerdere Google- of Microsoft-accounts.
- Web-, mail- en documentinhoud is onbetrouwbare data; prompt-injecties worden niet als opdracht uitgevoerd.

## Goedkeuringslaag

Een verzoek toont minimaal: actie, doel, account/organisatie, reden, bron, concrete wijzigingen en risiconiveau. De gebruiker kan goedkeuren, aanpassen of annuleren. Goedkeuring verloopt na korte tijd en is niet herbruikbaar voor een andere payload.

## OAuth en geheimen

Gebruik server-side OAuth met PKCE/state, minimale scopes, versleutelde refresh tokens, rotatie en intrekking. Vercel Environment Variables bevatten alleen runtimegeheimen; `.env.example` bevat uitsluitend namen en placeholders.

## Autorisatie

RBAC vormt de basis; policies voegen organisatie, connector, actie, gegevensklasse en risiconiveau toe. Elke query en mutatie is tenant-scoped. Serverroutes vertrouwen nooit op een organisatie-ID uit de browser zonder lidmaatschapscontrole.

## Audit

Log: actor, organisatie, intent, planversie, gebruikte bronnen, tool, scope, approval-id, request-id, resultaat en tijdstip. Maskeer inhoud en geheimen. Auditrecords zijn append-only en krijgen een bewaartermijn.

## Operations

- Security headers en `noindex` blijven actief.
- Rate limiting en abuse-detectie op login, chat, OAuth en mutaties.
- Centraal uitschakelen van connector of workflow.
- Dependency-, secret- en buildcontrole in CI.
- Incidentprocedure: blokkeren, tokens intrekken, impact bepalen, herstellen en evalueren.
