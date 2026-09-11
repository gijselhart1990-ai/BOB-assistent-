# Laptopbridge

Gebruik Node.js 22.12 of hoger en Chrome of Edge. Voer in deze map `npm ci` uit,
kopieer `.env.example` naar `.env` en stel site-URL en bridge-token in.
`npm start` start het proces; `npm run check` controleert de JavaScript-syntaxis.
De browser is zichtbaar zodat de gebruiker kan ingrijpen.

De afhankelijkheden zijn optioneel: zonder WhatsApp- of browserpakket zijn die
mogelijkheden niet beschikbaar. Installatie is niet hetzelfde als live acceptatie.
Gebruik TASK-003 in de hoofdrepository voor login, heartbeat en acties.

## Bekende upstream-beperking

Op 8 september 2026 meldt npm audit bij whatsapp-web.js 1.34.7 een kwetsbare
transitieve extract-zip-keten via Puppeteer. De beschikbare Puppeteer 24-releases
lossen dit niet op. Een geforceerde overstap naar Puppeteer 25 is niet zonder
compatibiliteitstest toegepast. Er zijn geen browserdownloads of WhatsApp-sessies
gestart tijdens de repositorycontrole.

Volg de upstream-fix via Dependabot. Voer vóór vrijgave `npm audit` uit en
beoordeel of WhatsApp in die omgeving kan worden ingeschakeld. Gebruik een
vertrouwde, bestaande browser; voer geen onbekende browserarchieven in.
