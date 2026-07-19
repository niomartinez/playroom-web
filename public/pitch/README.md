# /pitch deck assets

Shipped assets from the approved design handoff (PRG Deck Handoff, Jul 2026).
All adult media renders behind an 18+ click-to-reveal gate in the deck.

| File            | Used by                  | Notes |
|-----------------|--------------------------|-------|
| `logo-dark.png` | Cover + close            | Brand wordmark on dark. |
| `ui-strip.png`  | Cover + close            | Product UI strip, masked bleed at slide bottom. |
| `screen-full.jpg` | Showcase (gated)       | Full table view. Adult content. |
| `ui-betmenu.png` | Showcase side crop      | Bet menu / balance / chip rail (safe crop). |
| `ui-chat.png`   | Showcase side crop       | Live chat panel (safe crop). |
| `demo.mp4`      | Gameplay slide (gated)   | ~7.5 MB, 2920x1652. Muted, no autoplay; the deck crops the top 10.43% (capture chrome) via CSS. |

To replace the demo clip, keep the 2920x1652 frame (or update the
`aspect-ratio` + `top` crop in `src/app/pitch/pitch.css` `.demo-frame`).
