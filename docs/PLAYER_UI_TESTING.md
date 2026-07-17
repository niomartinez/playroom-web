# Player UI — BOD batch: testing & handoff

Adapts EVO-Live behaviours to our UI, mobile-first. All 13 items below are on
the **`staging`** branch of both repos (frontend `playroom-web`, backend
`topless-casino-backend`) and are **not** on prod yet.

> Chat/bets/settlement/session features need **real session tokens** on the
> real `/play` route. `/play/demo` uses a `"demo"` token that skips the chat
> WebSocket and places bets client-side only — good for UI/menu/timer/drag, not
> for chat or server-settled flows.

---

## 1. What shipped (feature → files)

| # | Feature | Frontend | Backend |
|---|---------|----------|---------|
| 1 | Big low-opacity countdown on the feed | `src/lib/use-countdown.ts`, `src/components/player/RoundCountdown.tsx`, `PlayerLayout.tsx`, `PlayerHeader.tsx` | — |
| 2 | Drag-to-move main bets | `src/lib/use-betting.ts` (`moveMainBet`), `src/components/player/MainBets.tsx`, `src/lib/game-context.tsx` (`moveStackedChips`), `src/app/api/bet/void/route.ts` | `app/api/internal/bets.py`, `app/schemas/bet.py` (optional `bet_code` on void) |
| 3 | Exact balance (no rounding) | `src/lib/currency.ts` (`formatBalance`), `BalanceBar.tsx` | — |
| 4 | Low-balance modal | `src/components/player/LowBalanceModal.tsx` | `app/api/internal/tables.py` (min/max in state) |
| 5 | Idle warnings + frozen "Session Expired" | `src/lib/use-idle-kick.ts` (`useIdleSession`), `src/components/player/SessionGuard.tsx`, `GameWrapper.tsx` | — |
| 6 | Winners marquee | `src/components/player/WinnersMarquee.tsx`, `use-lobby-ws.ts`, `game-context.tsx` | `app/services/settlement_service.py` (`RoundWinners` broadcast) |
| 7 | Minimized chat: last 3 float | `src/components/player/MobileChat.tsx` | — |
| 8 | How to Play | `src/components/player/PlayerMenu.tsx` | — |
| 9 | Sound & Video settings | `PlayerMenu.tsx`, `src/lib/media-prefs.ts`, `VideoPlayer.tsx` | — |
| 10 | Game history | `PlayerMenu.tsx` (`HistoryPanel`), `src/app/api/me/bet-history/route.ts` | `app/api/internal/me.py` (`GET /me/bet-history`) |
| 11 | Payouts & Limits | `PlayerMenu.tsx` | `app/api/internal/tables.py` (min/max) |
| 12 | Change name in chat settings | `MobileChat.tsx`, `LiveChat.tsx`, `GameWrapper.tsx` | — |
| 13 | Mobile-first | (constraint throughout) | — |

New surface: a **☰ menu** in the header (bottom sheet on mobile, card on
desktop) → How to Play / Payouts & Limits / Sound & Video / Game History.

---

## 2. Prerequisites

1. **Backend staging must be deployed** (Render auto-deploys on push to
   `staging`). Verify it's live and has the new endpoint:
   ```bash
   curl -s https://staging-api.playroomgaming.ph/health   # or /docs
   ```
   Items that need the backend deployed: **#11/#4** (table min/max), **#6**
   (winners), **#10** (bet history), **#2** (targeted void). They degrade
   gracefully until then (limits show "—", low-balance dormant, no marquee).
2. **Rounds must be running on the table you test.** No human dealer needed —
   from the backend repo root with the venv active:
   ```bash
   python -m scripts.mock_dealer                     # loop BAC-TABLE-01, Ctrl-C to stop
   python -m scripts.mock_dealer --betting-time 30   # wider window to bet/drag in
   ```
   It loops `POST /internal/emulator/deal`, which runs a full round through the
   same pipeline as the real Angel Eye bridge. Without rounds the market never
   opens and #2/#4/#5/#6/#10 are all inert.
3. **The player's operator MUST own the table.** The lobby WS filters every
   round broadcast by `operator_id`: a mismatched player connects, gets the
   initial snapshot, then receives *nothing* — no error, just a frozen UI. On
   staging `BAC-TABLE-01`/`-02` belong to **OCMS Philippines**; the `TEST*`
   tables are operator-less (unscoped, so any player receives them).
   `mint_test_tokens` now derives the operator from the table, so this is
   handled — but if round events ever go missing, check this first. (Quick
   triage: a `role:"studio"` ticket is unscoped, so if studio sees frames and
   the player doesn't, it's scoping — not the socket.)

---

## 3. Get test tokens

From the **backend repo root** with the venv active:

```bash
python -m scripts.mint_test_tokens --count 2                 # staging, auto table (BAC-TABLE-01)
python -m scripts.mint_test_tokens --count 2 --table BAC-TABLE-01
```

Prints ready `/play?token=...&game=...` URLs (TTL 8h). Open **each on a separate
browser/device** for multi-user tests (chat, winners). Prod: add
`--env-file .env.prod --web https://app.playroomgaming.ph` (mints REAL tokens —
avoid unless intentional).

---

## 4. Run it

- **Local dev against staging backend:** `npm run dev` in `playroom-web` →
  `http://localhost:3000/play?token=...&game=...` (env already targets staging).
  On a phone use your Mac's LAN IP.
- **Prod bundle locally:** `npm run build && npm run start`.
- **Straight on staging:** open the minted `https://staging-app...` URL.

---

## 5. Manual test matrix

Legend: 🟢 works on `/play/demo` · 🔴 needs a real token on `/play` (+ live dealer).

| # | Check | Where |
|---|-------|-------|
| 1 | During betting, a big translucent countdown ring is centered on the feed; goes red for the last 5s; header pill matches; fades when betting closes. | 🟢 |
| 3 | Balance shows exact cents (`₱10.61`), never rounded. | 🔴 (demo shows demo balance) |
| 2 | With a placed main bet, press-drag the chip onto another main pad → a ghost follows, target highlights, on drop the bet moves (source cleared, target shows total). Side bets untouched. Try Player→Banker (opposing/disabled target must still accept the drop), Player→Tie, and stacked chips. A plain tap still places a bet. | 🔴 (real void+re-place) / 🟢 visual only in demo |
| 4 | When a round opens and balance < table min, a dismissible "Low Balance" modal appears (once/round). | 🔴 |
| 5 | Skip betting for 4 rounds → amber warning; 5th → red warning; 6th → frozen "Session Expired" overlay (background dimmed/blocked, tab stays open, manual "Return to lobby"). Placing a bet resets it. | 🔴 |
| 6 | After a round settles, a vertical winners marquee (screen name + net win) shows top-left, then auto-hides. Needs ≥1 winner. | 🔴 (2 devices best) |
| 7 | Close the chat sheet → the last 3 incoming messages float bottom-left over the feed and fade (~5s). | 🔴 (2 devices) |
| 8 | ☰ → How to Play renders rules (EN + 中文 via lang switch). | 🟢 |
| 9 | ☰ → Sound & Video: mute + volume control the stream (in sync with the in-feed speaker), Reload stream reconnects. | 🟢 |
| 10 | ☰ → Game History lists your own bets with win/loss/push + net. | 🔴 |
| 11 | ☰ → Payouts & Limits shows the payout table + live table Min/Max. | 🟢 (limits need backend) |
| 12 | Chat → gear → Settings shows your Screen name + Edit (opens rename); no floating button anymore. Desktop chat has an edit icon too. | 🔴 (name needs profile) |
| 13 | Everything is usable one-handed on a phone; nothing overlaps the bet buttons. | 🟢/🔴 |

---

## 6. Automated checks (for Claude Code)

Run these in `playroom-web` unless noted:

```bash
npm run build            # must compile clean
npx tsc --noEmit         # must pass. NOT `npm run lint` — that script is still
                         # `next lint`, which Next 16 removed, and eslint isn't
                         # installed, so it only ever errors on a bogus path.
```

Backend (`topless-casino-backend`, venv active):
```bash
python -c "import ast,glob; [ast.parse(open(f).read()) for f in ['app/api/internal/me.py','app/api/internal/bets.py','app/services/settlement_service.py','app/api/internal/tables.py']]; print('ok')"
pytest tests/test_bet_void.py tests/test_bet.py -q      # bet/void + place paths
```

Backend endpoint smoke (needs a minted token = the `token` from a `/play` URL):
```bash
TOKEN=... ; curl -s https://staging-api.playroomgaming.ph/internal/me/bet-history \
  -H "X-Service-Key: $INTERNAL_SERVICE_KEY" -H "X-Session-Token: $TOKEN" | jq .
# table limits present:
curl -s https://staging-api.playroomgaming.ph/internal/tables/BAC-TABLE-01/state \
  -H "X-Service-Key: $INTERNAL_SERVICE_KEY" | jq '.data.table | {min_bet, max_bet}'
```

**Playwright (demo route, no token needed).** There's no player e2e yet
(`e2e/` only has `admin.spec.ts`). Write `e2e/player-demo.spec.ts` and drive the
**demo** route with a dev server running (`npm run dev`, then
`BASE_URL=http://localhost:3000 npm run test:e2e`). Cover the demo-testable
items: the ☰ menu opens and shows the four sections; How to Play / Payouts /
Sound render; the countdown appears during a betting window; balance renders
with two decimals. Live features (chat, settlement, session-expiry,
bet-history, real drag-move) require a token and a live dealer — verify those
manually or by scripting Playwright against a minted `/play` URL.

---

## 7. Promote to prod (when approved)

Both repos keep `main` == prod. After sign-off on staging:
```bash
# in each repo
git checkout main && git pull && git merge --ff-only staging && git push origin main
git checkout staging
```
Then confirm Render (backend) + Vercel (frontend) prod deploys are green.
