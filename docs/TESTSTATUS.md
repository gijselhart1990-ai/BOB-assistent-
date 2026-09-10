# Teststatus — 10 september 2026

Getest op de afgeschermde Vercel-preview van de onderhoudsbranch.

- Inloggen met code en toegangslijst: gebruiker bevestigt succes; ingelogde
  sessie en navigatie tussen dashboard en modules zijn in de browser bevestigd.
- Redis: eerder live gecontroleerd met PING en aanmaken/bijwerken van een
  fictief inlogpogingenrecord. Gelijktijdige live claims blijven te testen.
- Dashboard, Instellingen, Takenhub, Workflows en Security openen.
- Ontbrekende Google-, Microsoft- en Todoist-koppelingen tonen een lege status.
- AI is later afzonderlijk geconfigureerd en de preview is opnieuw gedeployd.
  Een neutrale vraag (2 plus 2, zonder tools) kreeg antwoord 4. Dit bevestigt
  de basisverbinding; toolgebruik en een dagbriefing zijn nog niet geaccepteerd.
- Laptopbridge offline. WhatsApp en echte mailinhoud nog niet geaccepteerd.
- Google multi-account: preview d343a79 is Ready; de twee Neon-tabellen zijn
  succesvol aangemaakt. De Google-startcontrole bereikt de aanmeldpagina.
  Het aangewezen zakelijke account is als testgebruiker opgeslagen. De eerdere
  access_denied-blokkade is verholpen. De gebruiker heeft de Google-toestemming
  doorlopen. BOB toont het account, agendaresultaten en nul ongelezen mails.
  Wisselen tussen beide accounts is live bevestigd; tokenverversing blijft open.

Bij de controle zijn verouderde hostingteksten en misleidende statuslabels
gevonden. De correctie noemt Vercel, markeert modules als in ontwikkeling en
toont Google-snelkoppelingen zonder verzonnen aantallen.

Vervolg: wijs testaccounts aan en configureer afzonderlijke testkoppelingen.
Schakel niet alle geërfde productieverbindingen tegelijk in. Voer de resterende
controles uit TASK-003 uit vóór een productiebeoordeling.

## Live vervolgcontrole

Het aangewezen zakelijke Google-account verschijnt als geselecteerd account in
BOB. De Google Workspace-pagina toont agendaresultaten en Gmail meldt nul
ongelezen berichten. Dit bevestigt de eerste koppeling en het teruglezen van
opgeslagen toegang voor de API-aanroepen. De eerste koppeling bleef behouden na
deploy b211879. Beide aangewezen accounts zijn nu gekoppeld. Wisselen in beide
richtingen toont de bijbehorende agendaresultaten. De Gmail-snelkoppeling opent
voor elk geselecteerd account de juiste inbox. Geforceerde tokenverversing
blijft afzonderlijk te controleren; de AI-agendatest staat hieronder.

De Gmail- en Agenda-snelkoppelingen gebruiken nu een beveiligde serverroute die
het geselecteerde eigen account doorgeeft aan Google. Een ontbrekend account
geeft in multi-accountmodus een fout, geen stille terugval op een ander account.

## Controle tokenverversing en chat

Regressietests controleren ongeldige/verlopen vervaltijden, behoud en rotatie
van refresh-tokens en weigering van ongeldige Google-antwoorden vóór opslag.
Google-tokenverzoeken hebben een time-out en volgen geen redirects.
De chat weigert in multi-accountmodus een ontbrekende accountselectie en
slikt fouten bij het ophalen van het account niet meer stil in.
Dit zijn code- en fictieve-datatests; een echte refresh-aanroep en een AI-antwoord
met accountgebonden context zijn hiermee nog niet live geaccepteerd.

## Live AI-acceptatie op preview 25b902a

Vercel bevestigt Ready voor deze versie. Op beide aangewezen accounts is dezelfde
AI-vraag over het aantal afspraken vandaag uitgevoerd. Beide antwoorden kwamen
overeen met de afzonderlijke agendaresultaten op het dashboard. Bij wisselen
verdween het chatantwoord van het vorige account. Een antwoord gebruikte ook
zichtbaar het agendagereedschap. Er zijn geen afspraaknamen of mailinhoud in
dit testverslag opgenomen. Dit valideert deze agenda-vraag, geen volledige
acceptatie van alle AI-tools of blijvende chatgeschiedenis.

## Blijvende chatopslag — voorbereid

Chatbeurten worden per omgeving, eigenaar en Google-account versleuteld in Neon
opgeslagen. Vraag en antwoord staan atomair in één rij. De laatste 25 beurten
worden teruggeladen in het dashboard; de AI krijgt de laatste 10 berichten.
Opslagfouten tonen een melding. Een mislukte historieaanvraag stopt de AI-aanroep
in de Neon-modus zodat ontbrekend geheugen niet stil wordt genegeerd.
Tests met nagebootste database-antwoorden controleren versleuteling, scheiding,
volgorde, gewijzigde ciphertext en storingen. De migratie 002_chat_turns.sql
is nog niet uitgevoerd: Vercel vraagt opnieuw tweestapsverificatie. Daarom is
deze wijziging nog niet naar de testbranch gepusht. Live herstel na verversen
en accountwisselen moet na de migratie en deployment worden getest.

De migratie 002_chat_turns.sql is inmiddels via de Vercel-query-editor uitgevoerd:
tabel en index gaven beide een succesvolle melding. Alleen-lezen is hersteld.
Live acceptatie volgt na de deployment.
