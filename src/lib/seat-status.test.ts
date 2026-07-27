/**
 * The seat-gate resolver — the fix for the fail-OPEN money guard.
 *
 * Run with `npx tsx src/lib/seat-status.test.ts` — the repo has no unit runner
 * (Playwright only), so this is a plain assert script rather than a suite.
 *
 * The case that matters most is the FIRST one: the old gate rendered nothing
 * when it knew neither the thresholds nor the balance, so a player under the
 * floor was seated with no modal and no video. "Unresolved" must never be
 * "open".
 */
import assert from "node:assert/strict";
import { resolveSeatGate, type SeatBootstrap, type SeatDecision } from "./seat-status";

const PROD_THRESHOLDS = { enter: 500, block: 100, warn: 500 };

function decision(over: Partial<SeatDecision> = {}): SeatDecision {
  return {
    enforced: true,
    blocked: false,
    floor: null,
    required: 0,
    balance: 1000,
    currency: "PHP",
    seated: false,
    live_stake: false,
    wallet_mode: "transfer",
    thresholds: PROD_THRESHOLDS,
    ...over,
  };
}

function input(over: Partial<Parameters<typeof resolveSeatGate>[0]> = {}) {
  return resolveSeatGate({
    token: "tok",
    bootstrap: { status: "unknown" } as SeatBootstrap,
    balance: 0,
    balanceLoaded: false,
    minSeatBalance: null,
    hasPlayed: false,
    hasLiveStake: false,
    // Default = a decision that just arrived, which is what the SSR pass and
    // every fresh poll look like. The staleness cases below set it false.
    liveStakeSnapshotValid: true,
    search: "", // never read the real URL from a test
    ...over,
  });
}

// THE bug: nothing known -> we must NOT fall through to a playable table.
{
  const g = input();
  assert.equal(g.state, "unresolved", "no thresholds and no balance is not 'open'");
}

// Demo and skipped launches keep their legacy no-gate behaviour.
{
  assert.equal(input({ token: "demo" }).state, "open");
  assert.equal(input({ bootstrap: { status: "skipped" } }).state, "open");
}

// A seamless-wallet player is gated by nobody server-side. The client must not
// invent a gate no server agrees with — even at a zero balance.
{
  const g = input({
    bootstrap: { status: "ok", seat: decision({ enforced: false, balance: 0 }) },
    balance: 0,
    balanceLoaded: true,
    minSeatBalance: PROD_THRESHOLDS,
  });
  assert.equal(g.state, "open", "enforced === false must never gate");
}

// Blocked at FIRST PAINT: bootstrap only, no WS frame, no table state.
{
  const g = input({
    bootstrap: {
      status: "blocked",
      seat: decision({ blocked: true, balance: 320, floor: "enter", required: 500 }),
    },
  });
  assert.equal(g.state, "blocked");
  assert.equal(g.required, 500, "an unseated player is quoted the buy-in bar");
  assert.equal(g.seated, false);
}

// Server-confirmed seated: the KEEP floor and the KEEP copy from frame one,
// rather than quoting the buy-in number until the first bet of the session lands.
{
  const g = input({
    bootstrap: { status: "ok", seat: decision({ balance: 320, seated: true }) },
  });
  assert.equal(g.state, "open", "320 clears the 100 keep floor");
  assert.equal(g.seated, true);
}
{
  const g = input({
    bootstrap: { status: "ok", seat: decision({ balance: 80, seated: true }) },
  });
  assert.equal(g.state, "blocked");
  assert.equal(g.floor, "keep");
  assert.equal(g.required, 100);
}

// REACTIVITY: a WS balance crossing the floor lifts the gate with no new server
// call. The server decision supplies inputs; it never latches the block.
{
  const blockedBootstrap: SeatBootstrap = {
    status: "blocked",
    seat: decision({ blocked: true, balance: 320, floor: "enter", required: 500 }),
  };
  assert.equal(input({ bootstrap: blockedBootstrap }).state, "blocked");
  const after = input({
    bootstrap: blockedBootstrap,
    balance: 900,
    balanceLoaded: true,
  });
  assert.equal(after.state, "open", "a top-up must lift the gate locally");
}

// ...and the reverse: a balance that DROPS mid-session gates without the server
// having said anything new.
{
  const g = input({
    bootstrap: { status: "ok", seat: decision({ balance: 5000 }) },
    balance: 20,
    balanceLoaded: true,
  });
  assert.equal(g.state, "blocked");
}

// A live stake is a full exemption — never shut the door on a player whose
// money is riding on the hand being dealt.
{
  const g = input({
    bootstrap: { status: "blocked", seat: decision({ blocked: true, balance: 0 }) },
    hasLiveStake: true,
  });
  assert.equal(g.state, "open");
}

/* ---------------------------------------------------------------- FIX 3 --
 * The `live_stake` SNAPSHOT must not outlive the hand it described.
 * -------------------------------------------------------------------- */

// While it is current it still bridges the gap before useStateRecovery has
// rehydrated the client's own bets on a mid-round refresh.
{
  const g = input({
    bootstrap: {
      status: "blocked",
      seat: decision({ blocked: true, balance: 0, live_stake: true }),
    },
    balance: 0,
    balanceLoaded: true,
    hasLiveStake: false,
    liveStakeSnapshotValid: true,
  });
  assert.equal(g.state, "open", "a current live_stake snapshot still exempts");
}

// THE BUG: the player refreshed holding a bet (snapshot says live_stake), the
// hand LOST, and the client has no bets of its own. The server has already cut
// the video and is refusing bets; a snapshot trusted for the rest of its 60s
// life is "no modal, no video" all over again.
{
  const g = input({
    bootstrap: {
      status: "blocked",
      seat: decision({ blocked: true, balance: 0, live_stake: true }),
    },
    balance: 0,
    balanceLoaded: true,
    hasLiveStake: false,
    liveStakeSnapshotValid: false,
  });
  assert.equal(g.state, "blocked", "a settled live_stake snapshot must not exempt");
}

// The client's OWN live stake always wins, however stale the snapshot is —
// that is the whole point of preferring live state.
{
  const g = input({
    bootstrap: {
      status: "blocked",
      seat: decision({ blocked: true, balance: 0, live_stake: true }),
    },
    balance: 0,
    balanceLoaded: true,
    hasLiveStake: true,
    liveStakeSnapshotValid: false,
  });
  assert.equal(g.state, "open");
}

/* ---------------------------------------------------------------- FIX 2 --
 * The client's fail direction on `seated` must match the server's:
 * `seat_service.evaluate_seat` -> `seated = True  # fail toward the LOWER
 * bar, never trap a seated player`.
 * -------------------------------------------------------------------- */

// Recovery with NO usable bootstrap: the two original transports still resolve
// it, exactly as before — this is why an `unknown` bootstrap is not terminal.
// But with no server answer we do NOT know whether this player has played here,
// so we take the KEEP bar, not the buy-in bar. 320 clears 100: no modal. The
// server enforces its own answer regardless, and use-seat-status is retrying.
{
  const g = input({
    bootstrap: { status: "unknown" },
    balance: 320,
    balanceLoaded: true,
    minSeatBalance: PROD_THRESHOLDS,
  });
  assert.equal(g.state, "open", "unknown `seated` takes the LOWER bar, like the server");
  assert.equal(g.seated, true);
}

// ...and the guard is still real: under BOTH floors there is no reading of
// `seated` that lets the player sit.
{
  const g = input({
    bootstrap: { status: "unknown" },
    balance: 50,
    balanceLoaded: true,
    minSeatBalance: PROD_THRESHOLDS,
  });
  assert.equal(g.state, "blocked");
  assert.equal(g.floor, "keep");
  assert.equal(g.required, 100);
}

// The COARSE-SKIP shape: `evaluate_seat` short-circuits when the balance it read
// already cleared both floors and reports `seated: false` without ever looking
// at prior play. A WS balance drop into the band must not turn that non-answer
// into the buy-in bar and cover a seated player's table with a modal the server
// would not agree with.
{
  const g = input({
    bootstrap: { status: "ok", seat: decision({ balance: 5000, seated: false }) },
    balance: 320,
    balanceLoaded: true,
  });
  assert.equal(g.state, "open", "a `seated: false` the server never computed is unknown");
  assert.equal(g.seated, true);
}

// A REAL `seated: false` — the server evaluated the floors against a balance
// that could not clear them — is still believed, and still quotes the buy-in
// bar. Failing toward the lower bar must not become "ignore the server".
{
  const g = input({
    bootstrap: { status: "ok", seat: decision({ balance: 320, seated: false }) },
    balance: 320,
    balanceLoaded: true,
  });
  assert.equal(g.state, "blocked");
  assert.equal(g.floor, "enter");
  assert.equal(g.required, 500);
  assert.equal(g.seated, false);
}

// Half-known is still unknown: thresholds without an authoritative balance must
// not compare against the placeholder 0 and accuse a funded player of being broke.
{
  const g = input({ bootstrap: { status: "unknown" }, minSeatBalance: PROD_THRESHOLDS });
  assert.equal(g.state, "unresolved");
}

// The client's own "has played here" latch also selects the keep floor, for the
// case where the player's first bet lands before the next seat refresh.
{
  const g = input({
    bootstrap: { status: "unknown" },
    balance: 320,
    balanceLoaded: true,
    minSeatBalance: PROD_THRESHOLDS,
    hasPlayed: true,
  });
  assert.equal(g.state, "open");
}

console.log("seat-status: all assertions passed");
