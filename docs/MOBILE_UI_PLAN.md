# Mobile UI Implementation Plan — `/play` Player Game

> Created: 2026-04-06
> Target: iPhone 16/17 Pro (402×874 viewport), general mobile (375-430px)
> Figma: https://www.figma.com/design/1vSwfNEVjtmkkwUkSJMWH0/Untitled--Copy-?node-id=66:3
> Must remain iframe-embeddable for operator portals

---

## Context for Claude

**You have everything you need in this repo.** No external research required.

- **Frontend repo:** `/Users/antoniomartinez/Documents/GitHub/playroom-web`
- **Backend repo:** `/Users/antoniomartinez/Documents/GitHub/topless-casino-backend`
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, inline styles (dark theme)
- **Figma file key:** `1vSwfNEVjtmkkwUkSJMWH0` — iPhone frame node: `66:3`
- **Assets downloaded:** `public/mobile-assets/` (chips-spritesheet.png, bet-card-texture.png, balance-icon.svg, people-icon.svg, dealer-table-bg.png)
- **CLAUDE.md** at repo root has full project context
- **Existing components:** `src/components/player/` — all the components you'll modify

### Testing Instructions

- Use **Playwright MCP** for E2E testing — navigate directly, bypass logins by setting cookies if needed
- **Dismiss Chrome save-password dialogs** if they appear (press Escape or click away)
- The `/play/demo` route requires NO auth — use it for testing mobile UI without login
- Test at **402px width** (iPhone 16/17 Pro) using Playwright browser resize
- The page must work in an **iframe** — operators embed `/play?token=...` in their casino portals

---

## Figma Design Spec (iPhone 16/17 Pro — 402×874)

### Layout: Single-column vertical scroll

The mobile layout is a **full-width vertical stack** (no grid columns). Users scroll down to see all sections. The Figma frame is 402×1312px (scrollable).

### Section Order (top to bottom)

```
┌──────────────────────────────┐
│ HEADER (sticky)              │  h: 80px
│ Logo + LIVE badge + Round #  │
├──────────────────────────────┤
│ VIDEO / DEAL AREA            │  h: ~228px (16:9 aspect)
│ Live stream or deal viz      │
│ Overlay: PRG logo watermark  │
├──────────────────────────────┤
│ ACTION BAR                   │  h: ~55px
│ ❤ SEND (tip) | 💬 Live Chat │
├──────────────────────────────┤
│ BALANCE + CHIPS              │  h: ~127px
│ Balance: $10,000             │
│ [10][25][50][100][500][1000]  │
├──────────────────────────────┤
│ SIDE BETS (4 across)         │  h: ~79px
│ [PERFECT][EITHER][PLAYER][B] │
│  PAIR     PAIR    PAIR  PAIR │
│  11:1     11:1    11:1  11:1 │
├──────────────────────────────┤
│ MAIN BETS (3 cards)          │  h: ~155px
│ ┌PLAYER┐ ┌─TIE──┐ ┌BANKER┐ │
│ │  P 0  │ │ T 0  │ │  B 0 │ │
│ │$646K  │ │$646K │ │$646K │ │
│ │ 47%   │ │ 47%  │ │ 47%  │ │
│ │ ━━━   │ │ ━━━  │ │ ━━━  │ │
│ └───────┘ └──────┘ └──────┘ │
├──────────────────────────────┤
│ ROADMAP                      │  h: ~370px
│ Big Road (grid)              │
│ [P: 0] [T: 0] [B: 0]       │
│ Next Prediction              │
│ (P) 0%  (T) 0%  (B) 0%     │
├──────────────────────────────┤
│ PLAYER/BANKER SCORE CARDS    │  h: ~156px
│ ┌──PLAYER──┐ ┌──BANKER──┐   │
│ │  (P) 0   │ │  (B) 0   │   │
│ │ Waiting.. │ │ Waiting..│   │
│ └──────────┘ └──────────┘   │
└──────────────────────────────┘
```

### Figma Node Map

| Section | Figma Node ID | Size (w×h) |
|---------|:---:|---:|
| Header | `66:549` | 402×80 |
| Video/Deal area | `66:7` (image) | 405×228 |
| Live Chat button | `66:1287` | 115×55 |
| Balance + Chips panel | `66:605` | 368×127 |
| Chip images (6 chips) | `66:617` → `66:619..624` | 51×51 each |
| Side bets (4 buttons) | `66:625` | 368×79 |
| Main bets (3 cards) | `66:650` | 368×155 |
| Roadmap | `66:741` | 363×369 |
| Player/Banker score cards | `66:1245` | 365×156 |

### Exact Figma Values

**Colors:**
- App background: `linear-gradient(107.15deg, #030712 0%, #101828 50%, #000000 100%)`
- Header bg: `#101828` (semi-transparent)
- Balance panel bg: `#101828`, border: `#364153` 0.8px
- Side bet buttons: gold gradient `linear-gradient(137deg, #CD8400 0%, #945401 100%)`, border: `rgba(208,135,0,0.5)` 1.6px
- Player Pair button: blue gradient `linear-gradient(137deg, #1559F4 0%, #183FBE 100%)`
- Banker Pair button: red gradient `linear-gradient(137deg, #E7000B 0%, #9F0712 100%)`
- Main bet PLAYER: blue gradient `linear-gradient(126.5deg, #0065FF 0%, #001556 100%)`, border: `rgba(43,127,255,0.5)` 1.6px
- Main bet TIE: green gradient `linear-gradient(126.5deg, #3AA128 0%, #005610 100%)`, border: `rgba(0,201,80,0.5)` 1.6px
- Main bet BANKER: red gradient `linear-gradient(126.5deg, #D93E40 0%, #560009 100%)`, border: `rgba(251,44,54,0.5)` 1.6px
- Player score card bg: `#1C2B4A`, border: `#2B7FFF` 1.6px
- Banker score card bg: `rgba(231,0,11,0.2)`, border: `rgba(251,44,54,0.5)` 1.6px
- LIVE dot: `#FB2C36` (red)
- Text primary: `#FFFFFF`
- Text muted: `#99A1AF`
- Text dim: `rgba(255,255,255,0.5)`

**Typography (all Inter):**
- Header "Live Baccarat": 14px regular, `#99A1AF`
- Header "LIVE": 16px bold, white
- Header "Round #50": 16px medium, white
- Balance label: 12px regular, `#99A1AF`
- Balance value: 20px bold, white
- Side bet label: 11px bold, white
- Side bet odds: 14px medium, white
- Main bet name: 14px bold, white
- Main bet amount: 14px semibold, white
- Main bet %: 12px medium, white, 80% opacity
- Score card name: 24px bold, white
- Score card score: 36px bold, white

**Spacing & Sizing:**
- App padding: 19px horizontal
- Section gap: ~16px vertical
- Side bet buttons: 85×79px, 14px border-radius
- Main bet cards: 1/3 width each, 155px tall, 14px border-radius
- Chips: 51×51px each, 4px shadow
- Balance panel: 14px border-radius
- Score cards: 16px border-radius
- Progress bar: 8px tall, 100% radius, white on white/20% bg

### Downloaded Assets (in `public/mobile-assets/`)

| File | Usage | Size |
|------|-------|------|
| `chips-spritesheet.png` | 6 chip denominations ($10-$1000) — spritesheet, crop per chip | 1536×1024 |
| `bet-card-texture.png` | Marble texture overlay on main bet cards (mix-blend-mode: color-burn) | 740×740 |
| `balance-icon.svg` | Gold coin icon next to balance | SVG |
| `people-icon.svg` | People icon showing bet count on main bet cards | SVG |
| `dealer-table-bg.png` | Dealer at table — placeholder for live video stream | 2656×1600 |

---

## Implementation Strategy

### Approach: Mobile-first responsive layer on existing components

**Do NOT rewrite components from scratch.** Add responsive breakpoints to existing components using Tailwind's `max-sm:` or `@media (max-width: 640px)` for mobile, preserving the existing desktop 5-column grid layout for screens > 640px.

### Key Principles

1. **Desktop layout unchanged** — all changes are additive via responsive classes/media queries
2. **iframe-safe** — no `window.parent` access, use postMessage for operator communication (existing `iframe-bridge.ts`)
3. **Vertical scroll on mobile** — replace desktop 5-column grid with single-column stack
4. **Touch-friendly** — min 44px tap targets for bet buttons and chips
5. **Same components, different layout** — `PlayerHeader`, `ChipSelector`, `MainBets`, `SideBets`, etc. get mobile variants via CSS, not separate component files
6. **Video area** — shows `DealVisualizer` (or future `VideoPlayer`) at 16:9 aspect ratio

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/play/page.tsx` | Add mobile layout wrapper — single-column stack below 640px |
| `src/app/play/demo/page.tsx` | Same responsive wrapper |
| `src/components/player/PlayerHeader.tsx` | Mobile header: logo + LIVE + Round # in compact bar |
| `src/components/player/BalanceBar.tsx` | Mobile: full-width card with balance + chips inline |
| `src/components/player/ChipSelector.tsx` | Mobile: horizontal scroll, 51px chips |
| `src/components/player/SideBets.tsx` | Mobile: 4-across grid with compact 85px buttons |
| `src/components/player/MainBets.tsx` | Mobile: 3-column grid with gradient cards, texture overlay, progress bars |
| `src/components/player/RoadmapPanel.tsx` | Mobile: full-width, compact Big Road grid |
| `src/components/player/DealVisualizer.tsx` | Mobile: 16:9 aspect ratio, full-width |
| `src/components/player/BaccaratTable.tsx` | Mobile: Player/Banker score cards at bottom |
| `src/components/player/LiveChat.tsx` | Mobile: floating button (bottom-right) |
| `src/app/globals.css` | Add mobile viewport meta if missing |

### New Files (if needed)

| File | Purpose |
|------|---------|
| `src/components/player/MobileActionBar.tsx` | Tip button + Live Chat button (between video and balance) |

---

## Step-by-Step Implementation

### Step 1: Mobile viewport + global mobile styles
- Ensure `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` is in layout
- Add global mobile styles in `globals.css` for the app background gradient
- Set `overscroll-behavior: none` to prevent pull-to-refresh in iframe

### Step 2: Page layout — single-column mobile stack
- Modify `src/app/play/page.tsx` layout: below 640px → single column, vertical scroll
- Keep existing 5-column grid for desktop (≥640px)
- Mobile order: Header → Video → Action Bar → Balance+Chips → Side Bets → Main Bets → Roadmap → Score Cards

### Step 3: PlayerHeader — compact mobile bar
- Mobile: 80px tall, logo left, LIVE badge center, Round # right
- Sticky top on scroll
- Use Figma values: `#101828` bg, rounded badges for LIVE and Round

### Step 4: DealVisualizer / Video area
- Mobile: full-width, 16:9 aspect ratio (~228px at 402px width)
- Overlay PRG logo watermark (semi-transparent, centered)

### Step 5: MobileActionBar (new component)
- Tip button (❤ SEND) on left, Live Chat button on right
- Only renders on mobile (hidden on desktop)

### Step 6: BalanceBar + ChipSelector
- Mobile: combined into one card (`#101828` bg, `#364153` border)
- Balance label + amount at top
- 6 chips in horizontal row below (51px each, from spritesheet)

### Step 7: SideBets — 4-across compact
- Mobile: 4 buttons in a row (85px each, 14px gap)
- Gold/blue/red gradient backgrounds per Figma
- Label (11px bold) + odds (14px medium)

### Step 8: MainBets — 3-card gradient layout
- Mobile: 3 equal cards, 155px tall
- Gradient backgrounds + marble texture overlay (`bet-card-texture.png`, `mix-blend-mode: color-burn`)
- Each card: name + people icon + bet count + amount + percentage + progress bar
- Blue (Player), Green (Tie), Red (Banker)

### Step 9: RoadmapPanel — compact mobile
- Mobile: full-width Big Road grid
- Score summary bar: [P:0] [T:0] [B:0]
- Next Prediction row

### Step 10: BaccaratTable / Score Cards
- Mobile: 2-column grid at bottom (Player left, Banker right)
- Blue border for Player, red border for Banker
- Score circle + "Waiting for bets..." text

### Step 11: Test with Playwright MCP
- Resize browser to 402×874 (iPhone 16/17 Pro viewport)
- Navigate to `/play/demo` (no auth required)
- Verify all sections render in correct order
- Verify scroll works smoothly
- Test chip selection + bet placement
- Test in iframe context (create a test page that iframes `/play/demo`)
- Check 0 console errors

### Step 12: Test on real device
- Open staging URL on iPhone in Safari/Chrome
- Verify touch interactions (tap to bet, swipe to scroll)
- Verify no zoom issues (viewport meta)
- Verify iframe embed works from operator domain

---

## Verification Checklist

After each step, verify with Playwright:

```
Test setup:
1. Navigate to https://playroom-web-hazel.vercel.app/play/demo
2. Resize viewport: browser_resize({ width: 402, height: 874 })
3. Take screenshot
4. Check console for errors

Per-section checks:
- [ ] Header: logo visible, LIVE badge, Round # — sticky on scroll
- [ ] Video area: 16:9, full-width, no overflow
- [ ] Action bar: Tip + Chat buttons visible
- [ ] Balance: shows $10,000, chip row visible, all 6 chips
- [ ] Side bets: 4 buttons in a row, labels readable, tap targets ≥44px
- [ ] Main bets: 3 cards visible, gradients correct, amounts shown
- [ ] Roadmap: Big Road grid visible, score summary
- [ ] Score cards: Player (blue) and Banker (red) at bottom
- [ ] Scroll: all sections accessible by scrolling
- [ ] No horizontal overflow (no x-scroll)
- [ ] Console: 0 errors
```

---

## iframe Embedding Requirements

The `/play` page is embedded by operators in their casino portals. Mobile UI must work in:

1. **Direct browser** — player opens URL directly
2. **iframe** — operator embeds `<iframe src="https://our-domain/play?token=...&tableId=...">` in their mobile site
3. **WebView** — some operators use native apps with WebView

### iframe-safe rules:
- No `window.top` or `window.parent` access (blocked by CORS)
- Use `postMessage` for operator communication (existing `src/lib/iframe-bridge.ts`)
- URL params: `token`, `tableId`, `currency`, `lang`, `mode` (existing)
- `overscroll-behavior: none` prevents iframe bounce
- No fixed positioning that breaks in iOS Safari iframe (use `sticky` instead)
- `touch-action: manipulation` prevents double-tap zoom

---

## Notes

- The Figma design uses **Inter** font which is already loaded via `next/font` in the project
- The existing desktop layout uses **inline styles** (not Tailwind classes) for most component styling — match this pattern for consistency
- The `GameWrapper.tsx` handles auth + WebSocket + game state — no changes needed, it wraps the UI regardless of layout
- The `DemoWrapper.tsx` provides the demo balance ($10K) — no changes needed
- Chip images in Figma are from a **spritesheet** (`chips-spritesheet.png`) — each chip is 256×256px in the sheet, rendered at 51×51px
