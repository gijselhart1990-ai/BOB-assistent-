# Beveiliging: huidig gedrag en vervolgwerk

## In de code afgedwongen

- Ondertekende sessies met eindige vervaltijd, plus e-mailtoegangslijst per route.
- Bridge-tokens worden gehasht opgeslagen en vereisen een toegestane gebruiker.
- Inloglinks worden atomair eenmaal gebruikt; inlogpogingen worden begrensd.
- Opslaguitval omzeilt de inlogbeveiliging niet, ook lokaal niet.
- Browsermutaties vereisen expliciet akkoord voor de opgeslagen opdracht.
- Verlopen en afgehandelde opdrachten kunnen niet opnieuw worden goedgekeurd.
- Gelijktijdige claims vergelijken opslagversies om dubbele uitvoering te voorkomen.
- Weblezers weigeren interne IP-adressen en controleren iedere redirect.
- Sessiecookies zijn HttpOnly en SameSite=Lax, en Secure bij een HTTPS-site-URL.
- Geen indexering of embedding in een iframe; basis security headers zijn ingesteld.

## Grenzen

Het huidige systeem is voor persoonlijk gebruik. RBAC, organisatie-isolatie,
volledige versleuteling van provider-tokens, een append-only auditlog en een
volledige Approval Hub zijn doelstellingen, geen geleverde garanties.
OAuth gebruikt ondertekende state; providergebonden PKCE en eenmalige state
moeten als afzonderlijke uitbreiding worden ontworpen en getest.

Login-rate-limiting is per e-mailadres. Algemene abuse-detectie en rate limits
voor chat, spraak en mutaties zijn nog vervolgwerk. De laptopbrowser heeft een
andere netwerkgrens dan de serverweblezer; beoordeel die bij TASK-003.

## Geheimen en incidenten

Bewaar secrets uitsluitend server-side; plaats geen klantgegevens in tests.
Redis-credentials zijn gevoelige runtimeconfiguratie en horen uitsluitend op de server.
Bij een incident: blokkeer toegang, trek tokens in, bepaal impact en herstel.
Zie SLEUTELS.md voor rotatie en TASK-003 voor live acceptatie.
