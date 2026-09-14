# TASK-003 — Integratieacceptatie

Status: open. Afhankelijkheden: gekozen hostingomgeving, testaccounts en
server-side ingestelde credentials. Geen geheimen in dit document plaatsen.

Doel: bewijzen dat de bestaande code in de echte omgeving werkt.

Acceptatie:
1. Controleer inloggen, hergebruik van een link, verlopen sessie en intrekken van toegang.
2. Controleer Redis-read/write, uitval en herstel; gebruik een afgescheiden testsite.
3. Koppel Google en Microsoft met de bestaande scopes; controleer tokenverversing.
4. Start de bridge; controleer heartbeat, lezen, toestaan, weigeren en timeout.
5. Controleer dat dubbele polls geen dubbele browseractie uitvoeren.
6. Controleer de afzonderlijke providerfouten zonder verlies van het hele dashboard.
7. Leg resultaten en resterende blokkades vast voordat productiegebruik wordt vrijgegeven.

Volgende architectuurstappen: bewaartermijnen voor tokens/jobs, een auditlog,
providercontracten en browserbridge-netwerkbeleid. Vereis een afzonderlijke
acceptatieproef voor nieuwe schrijfrechten of zorggegevens.
