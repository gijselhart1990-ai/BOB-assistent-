# GitHub en Vercel

## Productiestraat

`feature branch → pull request → GitHub Actions → review → main → Vercel production`

Vercel-project: `gijselhart1990-ai/bob-assistent`  
Productie: `https://bob-assistent.vercel.app/`

## Vercel-instellingen

- Framework preset: Next.js.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Node.js: 20 of hoger.
- Production branch: `main`.
- Preview deployments voor pull requests.

Zet runtimegeheimen in Vercel Environment Variables, gescheiden voor Development, Preview en Production. Gebruik nooit echte sleutels in GitHub, `.env.example`, screenshots of chatberichten.

## Verificatie vóór merge

```bash
npm ci
npm run typecheck
npm test
npm run build
```

De GitHub-workflow voert dezelfde controles uit. Een succesvolle push naar `main` triggert de bestaande Vercel-koppeling. Controleer daarna deploymentstatus en `/api/health`.

## Vercel-plugin

De ontwikkelplugin is geïnstalleerd met `npx plugins add vercel/vercel-plugin`. De agentomgeving moet na installatie opnieuw worden gestart om de commando's en deploymenttools in een nieuwe sessie te laden.

## Migratiepunt

De huidige bridge-wachtrij gebruikt Netlify Blobs. Voor volledige Vercel-productie wordt dit in fase 2 vervangen door een provider-onafhankelijke queue/persistente worker. Tot die migratie blijven bridge- en WhatsApp-browseracties experimenteel; de dashboardfoundation en korte API-routes kunnen wel op Vercel draaien.
