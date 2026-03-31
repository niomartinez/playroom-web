# Project Context

Web UI for Play Room Gaming live baccarat. Two UIs in one repo, deployed on Vercel.

## URLs
- Production: https://playroom-web-hazel.vercel.app
- Studio: /studio (login: shared credentials, IP whitelisted)
- Player: /play (public, iframe-embeddable)
- Backend API: https://topless-casino-api.onrender.com
- Repo: https://github.com/niomartinez/playroom-web

## Stack
- Next.js 16, TypeScript, Tailwind CSS 4
- Vercel (hosting, auto-deploys from GitHub main branch)
- Inter font (next/font/google)

## Structure
- `src/app/studio/` — Studio dashboard (login-gated)
- `src/app/play/` — Player-facing game UI
- `src/app/api/studio/` — Login/logout API routes
- `src/components/studio/` — Studio components (roads, scores, panels)
- `src/components/player/` — Player components (bets, chat, table, chips)
- `src/lib/auth.ts` — JWT session auth for studio
- `src/lib/api.ts` — Backend API client
- `src/proxy.ts` — Next.js 16 proxy (replaces middleware.ts)
- `public/` — Logo, texture, placeholder images

## Design System
Colors from Figma (exact values):
- Banker: #fb2c36, Player: #2b7fff, Tie: #00bc7d
- Lucky 6: #f0b100, Dragon 7: #ff009d, Panda 8: #00ffe5
- Gold border: rgba(208,135,0,0.3)
- Studio bg: gradient black → #171717 → black
- Player bg: #0a0f1a, panels: #101828, borders: #364153

## Layout Approach
- Both UIs use viewport units (vh/vw) for proportional scaling
- Studio: CSS grid with fr-based rows, h-screen, no scrolling
- Player: CSS grid with fixed vh rows + 1fr video area, no scrolling
- All road grids use aspect-ratio:1 for perfect circles/squares

## Running
```bash
npm run dev    # starts on localhost:3000
npm run build  # production build
```

## Auth
- Studio: shared credentials (STUDIO_USERNAME/STUDIO_PASSWORD env vars)
- JWT session cookie (12h expiry)
- IP whitelist via STUDIO_ALLOWED_IPS env var
- Player: no auth (operator manages sessions via seamless wallet)
