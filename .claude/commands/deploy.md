---
description: Controleer en publiceer BOB naar Netlify
---

Publiceer de huidige stand naar Netlify.

1. Draai `npm run verify` (typecheck + build). Faalt dit, stop dan en los eerst op.
2. Toon `git status` en de diff van wat er verandert.
3. Vraag om akkoord voordat je commit en pusht — Netlify deployt automatisch bij een push naar `main`.
4. Commit in het Nederlands, met een regel die zegt waaróm.
5. Push, en meld welke Netlify-deploy erbij hoort.
