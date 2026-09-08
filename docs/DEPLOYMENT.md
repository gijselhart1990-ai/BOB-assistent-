# Deployment en beheer

## Voorwaarden

Gebruik Node.js 22.12 of hoger, npm ci en npm run build. De production branch
is main; wijzigingen worden eerst in een pull request gecontroleerd.
Een geslaagde build bewijst nog geen werkende live koppelingen.

## Netlify

netlify.toml configureert Next.js en Node 22. Netlify Blobs wordt automatisch
gekoppeld in de Netlify-runtime. Zet secrets uitsluitend in de serveromgeving.

## Vercel of lokaal

Next.js kan hier draaien, maar Blobs wordt niet automatisch geconfigureerd.
Stel NETLIFY_SITE_ID en NETLIFY_AUTH_TOKEN server-side in voor een geschikte
Netlify-site. Gebruik gescheiden sites voor test en productie. Het token is
gevoelig en mag nooit NEXT_PUBLIC_ krijgen of in git worden opgeslagen.

Zonder werkende opslag weigert de inlogbeveiliging verzoeken en kan de bridge
geen opdrachten opslaan. Er is geen onbeveiligde lokale fallback.
De eerder genoemde Vercel-site is niet door een build gecontroleerd of aangepast.

## Vrijgave

1. npm ci en npm run verify; controleer GitHub Actions.
2. Stel site-URL, sessiegeheim, toegangslijst, Blobs en Xano in.
3. Configureer alleen benodigde providers en bestaande scopes.
4. Voer TASK-003 uit op testaccounts, inclusief uitval en herstel.
5. Merge en publiceer pas na beoordeling van de concrete wijzigingen.

Voor herstel: rol de applicatie terug naar de laatst gevalideerde commit en
controleer opslagcompatibiliteit. Deze onderhoudsbranch migreert geen bestaande
opslagsleutels. Bewaar secrets buiten versiebeheer; roteer volgens SLEUTELS.md.

## Preview-isolatie

Preview- en branch-deployments krijgen automatisch een eigen Blobs-namespace.
Bestaande productieopdrachten, inloglinks en tellers worden niet gedeeld.
Externe integraties (inclusief Xano en de mailer) zijn in previews standaard
uitgeschakeld. Gebruik eerst de inlogcode om de interface te testen. Stel pas
`BOB_PREVIEW_INTEGRATIONS=enabled` in na configuratie van aparte testaccounts.
Een geldige BOB_SESSION_SECRET, BOB_ALLOWED_EMAILS en BOB_LOGIN_CODE blijven
vereist; vul nieuwe credentials zelf in de hostinginterface in.
