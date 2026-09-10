# Teststatus — 9 september 2026

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
- Laptopbridge offline. WhatsApp, echte mail en agenda nog niet geaccepteerd.

Bij de controle zijn verouderde hostingteksten en misleidende statuslabels
gevonden. De correctie noemt Vercel, markeert modules als in ontwikkeling en
toont Google-snelkoppelingen zonder verzonnen aantallen.

Vervolg: wijs testaccounts aan en configureer afzonderlijke testkoppelingen.
Schakel niet alle geërfde productieverbindingen tegelijk in. Voer de resterende
controles uit TASK-003 uit vóór een productiebeoordeling.
