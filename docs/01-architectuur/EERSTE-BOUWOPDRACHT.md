# Eerste bouwopdracht — BOB Core foundation

Lees eerst INFRASTRUCTUUR-V1.md, README.md, SETUP.md, CLAUDE.md, package.json en de bestaande tests. Controleer de werkelijke repositorystructuur vóór wijzigingen. Werk uitsluitend op een nieuwe featurebranch en maak een draft-PR. Behoud de bestaande interface en alle werkende routes.

## Opdracht

Voer eerst een technische inventarisatie uit van de bestaande gateway, authenticatie, connectoren, bridge, opslag en CI. Maak een overzicht van bestaande onderdelen versus ontbrekende bouwstenen en identificeer veiligheidsrisico's. Onderzoek met name tokenversleuteling, sessie-intrekking, autorisatie per account, bridge-capabilities, goedkeuringscontroles en audit. Rapporteer bevindingen zonder secrets of gevoelige gegevens te tonen.

Implementeer daarna alleen de eerste veilige verticale slice: een getypeerd opdrachtcontract, een policyfunctie met default deny, een in-memory of test-persistente mockworkflow voor Dagstart, een mockconnector met synthetische gegevens, correlation-ID's en een audit-eventcontract. Laat de bestaande frontend deze mockworkflow openen en de voortgang tonen zonder de visuele stijl te vervangen. Voeg unit- en integratietests toe voor toegestane reads, geweigerde writes, ontbrekende rechten en een mislukte connector. Controleer dat dezelfde action-ID niet dubbel wordt uitgevoerd.

## Grenzen

Geen echte OAuth-tokens gebruiken of opvragen. Geen productieconfiguratie wijzigen. Geen externe mails, agenda-afspraken of facturen verzenden of wijzigen. Geen database wissen of migreren. Geen nieuwe cloudservices, betaalde abonnementen of brede MCP-rechten aanmaken. Geen laptopbesturing inschakelen. Geen secrets in prompts, commits, logs of testfixtures. Maak uitsluitend onbruikbare voorbeeldconfiguratie. Vraag afzonderlijk akkoord voor een stap die buiten deze grenzen valt.

## Oplevering

Een draft-PR met architectuurnotitie, codewijzigingen, tests, exacte lokale startinstructies, testresultaten, openstaande risico's en een rollbackplan. De volgende fase, Google OAuth met minimale leesrechten, begint pas na review van deze milestone. Meld expliciet wat niet is getest of niet toegankelijk was. Geen claim dat iets werkt zonder een daadwerkelijk uitgevoerd bewijs.
