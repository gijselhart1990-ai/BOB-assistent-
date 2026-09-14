# TASK-005 — Outlook via Vercel

Status: Microsoft-account aangewezen; web-terugkeeradres opgeslagen en gecontroleerd. De mailbox is nog niet gekoppeld.

## Configuratie gecontroleerd op 11 september 2026

- De eigenaar heeft de zakelijke Outlook-mailbox aangewezen. Beoogde werkcontext:
  Standup Zorg; geen gedeelde mailcontext met ActiefLeren.
- Bestaande Microsoft-appregistratie: `Bob-assitant`.
- Het volgende web-terugkeeradres is na toestemming opgeslagen en zichtbaar
  gecontroleerd in Microsoft Entra:
  `https://bob-assistent-git-maintenance-reposito-c11d94-gijselhart1990-ai.vercel.app/api/oauth/microsoft/callback`.
- Impliciete tokenstromen zijn niet ingeschakeld. De bestaande gedelegeerde
  Graph-machtiging is alleen `User.Read`; toestemming voor mail en agenda volgt nog.
- Versleutelde Microsoft-opslag, PKCE en afzonderlijke previewconfiguratie zijn
  geïmplementeerd. Lint, typecontrole, alle tests en build slagen lokaal.
- Migratie 003 is live uitgevoerd; de negen kolommen zijn via een leesquery
  gecontroleerd. De query-editor staat weer op alleen-lezen.
- Commit `63d309f` is gedeployd als Preview `C8TGvqvbdw65SVkrW8dQphpPitDa`
  (Ready, 41 seconden). Productie is niet gewijzigd.
- Op 13 september zijn client-id, tenant, mailbox en werkcontext opgeslagen als
  afzonderlijke Microsoft-previewvariabelen voor `maintenance/repository-foundation`.
- Het clientgeheim is door de eigenaar opgeslagen en de aanwezigheid op de
  Preview-branch is gecontroleerd zonder de waarde te lezen. Er staat ook een
  extra kopie onder Production; deze is niet gewijzigd.
- Herdeployment `E1AskMLnWuHPXwNeooRQanqsiSqs` is Ready (54 seconden).
  Microsoft-aanmelding is gestart vanuit de Standup Zorg-werkcontext.
- De eigenaar heeft de koppeling voltooid: Instellingen toont Microsoft gekoppeld
  binnen de Standup Zorg-werkcontext. Het Outlook-scherm toont een succesvolle
  mailopvraging met nul ongelezen berichten (de UI toont dit alleen bij `outlook.ok`).
- Het oude Microsoft-toestemmingsvenster is gesloten om verwarring te voorkomen.
  Wisselen naar ActiefLeren toont Outlook als niet gekoppeld; terugwisselen naar
  Standup Zorg herstelt de succesvolle mailweergave zonder opnieuw aanmelden.
  Live agendacontrole en tokenverversing na verloop blijven openstaande acceptatiepunten.

## Feitelijke uitgangssituatie

- De bestaande connector leest Outlook-mail en agenda via Microsoft Graph.
- Microsoft-tokens gaan nu naar Neon, gebonden aan één Google-werkcontext.
  Bestaande Xano-tokens worden niet automatisch geïmporteerd.
- De webcallback gebruikt authorization code met PKCE en een verplicht web-clientgeheim.
- Google-accountkeuze en chatopslag zijn live beschikbaar. Microsoft toevoegen aan
  de AI-context vraagt een expliciete keuze: gedeeld over beide Google-accounts,
  of gekoppeld aan één werkcontext. Niet stil mail uit verschillende bedrijven mengen.

## Uitvoering

1. Laat de eigenaar het Microsoft-account en de gewenste werkcontext aanwijzen.
2. Voeg versleutelde Neon-opslag toe met scheiding per omgeving, eigenaar en
   geverifieerde Microsoft-identiteit. Controleer de opslag vóór OAuth-start.
3. Maak afzonderlijke Microsoft-previewconfiguratie, zonder productiesleutels te erven.
4. Gebruik een passende web-appregistratie en authorization code met PKCE.
   Bewaar de servercredential alleen als Vercel-secret. Verifieer tenant en account.
5. Behoud bestaande leesscopes: User.Read, Mail.Read, Calendars.Read en offline_access.
6. Test tokenrotatie, opnieuw koppelen, foutafhandeling, caches en AI-context met
   nagebootste data. Voer npm run verify uit.
7. Laat de gebruiker de concrete Microsoft-toestemming beoordelen en test vervolgens
   de aangewezen mailbox en agenda. Controleer behoud na deployment.

Microsoft-documentatie:
https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

Configuratie en migratiegrenzen: [Outlook via Vercel](../docs/OUTLOOK-VERCEL.md).
