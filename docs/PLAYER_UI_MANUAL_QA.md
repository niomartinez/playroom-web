# Player UI — what still needs a human

Everything in the BOD batch has been checked as far as automation honestly can.
This is the remainder: checks that need eyes on a screen or hands on a phone.

Written 2026-07-17, after a validation pass on `staging`. Both repos are on
`staging`; **nothing here is on prod**.

Scope note — what's already done, so you don't redo it:

| Verified without a human | How |
|---|---|
| #1 countdown ring, #8 How to Play, #9 panel renders, #10 empty state, #11 payouts + live limits | `e2e/player-demo.spec.ts` (3 specs, green) |
| #3 exact balance | e2e + live token (`₱10,000.00`, bet 100 → payoff 200 → 10,100) |
| #6 marquee **payload** | captured the live `RoundWinners` frame: `"user": "TesterA_5aba"` (real name, not the `"Player"` fallback) |
| #2 void **API round-trip** | targeted void refunded, side bet survived, re-place worked, `void_refund` ledger row written |
| #10 bet history **data** | settled bet returned `outcome: "win"`, and a voided bet returned `outcome: "void"` |
| #12 rename **on desktop** | edit icon → dialog → Save → `display_name` persisted server-side |

What's left is below. Most of it is *visual* or *gestural* — the layer
automation can't speak for.

---

## Setup (once)

Two terminals from the **backend repo root**, venv active.

**1. Start rounds.** No studio dealer needed:

```bash
python -m scripts.mock_dealer --betting-time 30
```

Loops real rounds (start → betting → deal → settle → close). A 30s window
gives you time to drag and fiddle. Ctrl-C to stop. Leave it running for
everything below.

**2. Mint tokens** (TTL 8h):

```bash
python -m scripts.mint_test_tokens --count 2      # normal wallet (₱10,000)
```

Open each printed `/play?token=...` URL in a **separate browser** (not just a
new tab — the token→cookie handoff is per-browser). One in Chrome, one in a
private window or a second browser.

> **If the UI looks frozen** — connects, renders once, then nothing: the
> player's operator doesn't own the table. The lobby WS filters every round
> broadcast by `operator_id` and drops the rest silently. `mint_test_tokens`
> now derives the operator from the table so this should be handled; see
> `PLAYER_UI_TESTING.md` §2.3 if it recurs.

---

## The checks

### #2 — Drag-to-move: the gesture · **needs a human**

I verified the API round-trip (void → re-place → ledger), but not one pixel of
the interaction. This is the biggest gap.

With a bet placed on PLAYER, press-drag the chip onto another pad:

- [ ] A ghost chip follows the pointer.
- [ ] The target pad highlights as you hover it.
- [ ] On drop: source clears, target shows the combined total.
- [ ] **Player → Banker.** The opposing-bet rule *disables* the Banker pad —
      it must **still accept the drop**. This is the case most likely to break.
- [ ] **Player → Tie.**
- [ ] **Stacked chips** (bet several chips on one pad first) move together.
- [ ] A plain **tap still places a bet** — the drag must not swallow taps.
- [ ] Side bets (Player Pair etc.) are untouched by a main-bet move.
- [ ] Drag and release **outside** any pad → nothing moves, no bet placed.

**Exercises a fix — please be deliberate here.** `suppressClickRef` was set on
every completed drag but only ever cleared by a trailing click. After a
Player→Banker move the source pad can become disabled, so no click arrives, the
flag stranded, and **the next real tap on any pad was silently swallowed**. It
now self-clears. To confirm: do a Player→Banker drag, then immediately tap any
pad — **that tap must place a bet.** Repeat a few times.

### #4 — Low-balance modal · **needs a human**

Mint a deliberately broke player (table min is ₱10):

```bash
python -m scripts.mint_test_tokens --count 1 --balance 5
```

- [ ] When a round **opens**, a dismissible "Low Balance" modal appears.
- [ ] It appears **at most once per round** (dismiss it; it stays gone until
      the next round opens).

**Exercises two fixes:**
- [ ] **No false fire.** Load a **normally funded** token (₱10,000) while a
      round is open, several times, hard-refreshing. The modal must **never**
      flash. `balance` starts at 0 until the wallet socket reports, and it used
      to race — funded players got told they were short.
- [ ] **Auto-close on recovery.** With the modal up on the broke player, top
      them up (re-mint with `--balance 5000`, or credit the wallet). The modal
      must **close itself** — it previously stayed on screen forever, despite
      the component's own comment promising otherwise.

### #5 — Idle warnings → frozen session · **needs a human** (~5 min)

With the dealer looping, just **don't bet**. Count round *openings*:

- [ ] After 4 skipped rounds → **amber** warning.
- [ ] 5th → **red** warning.
- [ ] 6th → frozen **"Session Expired"** overlay: background dimmed and
      click-blocked, tab stays open, manual "Return to lobby".
- [ ] **Reset:** restart, skip 2–3 rounds, then place a bet — the warning must
      clear and the count restart.

Known rough edges found in review, not fixed — see if they bite in practice:
- The reset latches on the *optimistic* bet, so a **rejected** bet may still
  clear the warning.
- The idle counter runs while the first-login username modal is up, when
  betting is impossible.

### #6 — Winners marquee: the render · **needs a human**

The payload is confirmed carrying real names. **The UI has never been seen
rendering it.**

Two browsers, both betting the same pad so at least one wins:

- [ ] After settlement, a vertical marquee appears **top-left**.
- [ ] It shows **screen name + net win** — real names (e.g. `TesterA_5aba`),
      **not** the literal "Player" for everyone. (That was the bug: the
      settlement query never selected `display_name`.)
- [ ] It **auto-hides**.
- [ ] Losers / zero-win players are not listed.
- [ ] Watch across several rounds: a stale round's winners must not replay
      (nothing ever clears `roundWinners` from context — flagged, not fixed).

### #7 — Floating chat, last 3 · **needs a human** (2 browsers)

- [ ] Close the chat sheet. From the other browser, send messages.
- [ ] The last **3** incoming messages float bottom-left over the feed.
- [ ] They fade (~5s).
- [ ] **Your own** messages don't float.

Flagged in review, worth watching: the float tracker keys off `messages.length`,
which stops growing at the 100-message cap and *shrinks* on a reconnect
(history replaces the array). On a busy table floats may stop appearing, or
briefly show the wrong messages after a reconnect.

### #9 — Sound & Video · **needs a human** (needs audio + a working stream)

The stream wasn't up during validation, so nothing here is confirmed.

- [ ] ☰ → Sound & Video: **mute** actually silences the stream.
- [ ] **Volume** slider actually changes loudness.
- [ ] Menu control and the **in-feed speaker** stay in sync.
- [ ] **Reload stream** reconnects a stalled feed.

**Exercises a fix:** with a **fresh browser profile** (empty localStorage),
unmute and confirm you get **audible sound**. `getVolume()` returned `0` on
first run — `Number(null)` is `0`, which is finite and inside `0..1`, so it
sailed past the range guard. Unmuting a brand-new player produced silence at
volume 0 with no way to tell why.

Known, **not fixed** — confirm how bad it feels before deciding:
- Drag the panel slider to 0, then hit "Unmute": the menu icon and the in-feed
  icon disagree (menu keys off `muted` alone; in-feed off `muted || volume===0`).
- The two sliders show different positions for the same state (menu shows
  `volume`, in-feed shows `muted ? 0 : volume`).

### #10 — Game history: the render · **needs a human**

Data is confirmed; the panel rendering isn't.

- [ ] ☰ → Game History lists **your own** bets with win/loss/push + net.
- [ ] **Cents are exact.** Bet ₱50 on **Banker** and win: 0.95 odds nets
      **₱47.50** and must display `+₱47.50` — **not** `+₱48`. It used to render
      via `formatMoney`, which rounds. This is the whole point of item #3.
- [ ] Drag a bet from one pad to another, then open history: the moved-away leg
      shows **"Void"** — not "Pending". (Voided bets never equalled SETTLED, so
      they read "Pending" forever.) Check the Chinese label too: **已作废**.
- [ ] Empty state (`No bets yet.`) on a fresh token.

### #12 — Rename, mobile path · **needs a human**

Desktop is confirmed. The **mobile** path isn't:

- [ ] Chat → **gear** → Settings shows your Screen name + Edit.
- [ ] Edit opens the rename dialog; Save persists.
- [ ] The old floating rename button is **gone**.

Flagged, not fixed: returning from Settings to the message feed may leave the
feed scrolled to the **oldest** message (the scroller remounts and the
auto-scroll effect doesn't depend on `showSettings`). Worth a look while you're
in there.

### #13 — Mobile-first · **needs a real phone**

Chrome's device emulation clamps width on this machine (~500px), so this needs
actual hardware.

- [ ] One-handed use on a real phone.
- [ ] **Nothing overlaps the bet buttons** — check the winners marquee,
      floating chat, low-balance modal and session overlay all at once if you
      can force them to coincide.
- [ ] No horizontal scrolling at 360–390px.
- [ ] Bet pads and chips are comfortably tappable.

**Known:** touch targets are **38px** against the 44px iOS guideline (chip rail,
chat header icons). Not fixed — it's a design call, and it's your call whether
it ships.

---

## Not a test — decisions waiting on you

Found in review, deliberately left alone because they're judgment, not defects:

1. **Paytable can lie.** `PAYOUTS` is a hardcoded frontend constant, but
   settlement resolves odds at runtime from `system_config.baccarat_odds`.
   Change that row and the published table silently diverges from what's paid.
   Fix = serve odds from the backend. *This one has regulatory teeth.*
2. **Limits are advertised wrong.** Payouts & Limits shows the raw table
   min/max (₱10 / ₱10,000), but bets are validated against the tightest of
   (table, per-code) — where per-code is **₱50–₱500,000**. So the panel says min
   ₱10 while a ₱10 bet is rejected. (It also means the #4 low-balance modal
   fires at `< ₱10`, not at the ₱50 you actually need.)
3. **38px touch targets** (above).
4. **`npm run lint` is dead.** Next 16 removed `next lint` and eslint was never
   installed — the script only errors on a bogus path. Use `npx tsc --noEmit`.
   Adopting ESLint is its own task; expect a large first-run backlog.

---

## Before promoting to prod

`main` is untouched in both repos. When this is signed off:

```bash
# in EACH repo
git checkout main && git pull && git merge --ff-only staging && git push origin main
git checkout staging
```

**The backend migration must be applied to the prod DB *before* the code
deploys.** `supabase/migrations/20260717120000_void_player_bets_atomic_bet_code.sql`
drops the 2-arg `void_player_bets_atomic` and recreates it with
`p_bet_code TEXT DEFAULT NULL`. The default keeps the old call site working, so
migration-first is safe both ways; code-first fails **every void** until it
lands.
