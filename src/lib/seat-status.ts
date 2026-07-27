import { resolveMinSeatBalance, type MinSeatBalance } from "./min-seat-balance";

/**
 * The seat decision, and the one function that resolves it.
 *
 * WHY THIS EXISTS. `SeatBalanceGate` used to compute the gate itself from two
 * independent async transports — the balance WebSocket (`balanceLoaded`) and a
 * one-shot `/api/tables/{id}/state` fetch (`minSeatBalance`) — and rendered
 * NOTHING until both had landed. Both are browser-originated, so a shield, an
 * extension, a CSP or plain bad luck made either one never arrive, the gate
 * silently evaluated to "not gated", and a player under the floor walked in
 * with no modal. Meanwhile the server had already cut their video and was
 * refusing their bets. A fail-OPEN money guard that looked, from the outside,
 * like "no dialog and no stream".
 *
 * The fix is not more retries — it is an ANSWER that already exists at first
 * paint. `GET /internal/me/seat` makes the decision server-side and the /play
 * Server Component hands it down as {@link SeatBootstrap}. This resolver then
 * only ever RE-DERIVES the same decision, which is what keeps it reactive: a
 * top-up over the floor lifts the gate with no further server call.
 *
 * Isomorphic on purpose — no React, no server imports — so it runs in the SSR
 * pass, in the browser, and in `seat-status.test.ts`.
 */

/** Produced ONLY by the backend `seat_service.evaluate_seat`. */
export interface SeatDecision {
  /** false = nobody gates this player (seamless wallet, null balance, or all
   *  floors 0). The client MUST NOT invent a gate the server does not have. */
  enforced: boolean;
  blocked: boolean;
  /** Which floor produced the block; null when not blocked. */
  floor: "enter" | "keep" | null;
  /** THE FIGURE TO DISPLAY — the applicable floor. 0 when not enforced. */
  required: number;
  balance: number | null;
  currency: string | null;
  /** Has played at THIS table. Latched server-side, not "chips down now". */
  seated: boolean;
  /** Holds an unsettled ACCEPTED bet -> full exemption. */
  live_stake: boolean;
  wallet_mode: "transfer" | "seamless" | string;
  thresholds: Partial<MinSeatBalance>;
}

export type SeatBootstrap =
  /** Authoritative, not blocked. */
  | { status: "ok"; seat: SeatDecision }
  /** Authoritative and blocked — render the modal on the FIRST paint. */
  | { status: "blocked"; seat: SeatDecision }
  /** Fetch failed/timed out. Must NOT fall through to a playable table. */
  | { status: "unknown" }
  /** Demo, no token, or no `?game=` — legacy behaviour, no gate. */
  | { status: "skipped" };

export const SEAT_BOOTSTRAP_SKIPPED: SeatBootstrap = { status: "skipped" };

export interface SeatGateInput {
  token: string | null;
  bootstrap: SeatBootstrap;
  /** Live wallet figure from the balance WS. Only trusted when `balanceLoaded`. */
  balance: number;
  balanceLoaded: boolean;
  /** Thresholds from table state, if that transport got through. */
  minSeatBalance: Partial<MinSeatBalance> | null;
  /** Client-latched "has bet at this table this page lifetime". Latched on
   *  SERVER-CONFIRMED play only — see `use-seat-gate.ts`. */
  hasPlayed: boolean;
  /** Chips riding on the hand being dealt right now. LIVE client state. */
  hasLiveStake: boolean;
  /**
   * May the server decision's `live_stake` still stand in for `hasLiveStake`?
   *
   * The decision is a SNAPSHOT — `use-seat-status` refreshes it once a minute —
   * and `live_stake` is the one field on it that describes a single HAND rather
   * than a standing state. A player who refreshes mid-round holding a bet and
   * then LOSES it is under the floor with nothing pending: the server cuts
   * their video and refuses their bets, while a stale `live_stake: true` keeps
   * the client wide open for the rest of that minute. "No modal, no video" —
   * the exact bug this module exists to close.
   *
   * So the snapshot only stands in until the client has seen the hand it
   * described end. `use-seat-gate` owns that bookkeeping; between then and the
   * client's own `hasLiveStake` there is no window where nobody is watching.
   */
  liveStakeSnapshotValid: boolean;
  /** location.search, for the off-prod QA override. */
  search?: string;
}

export interface SeatGate {
  /**
   * `unresolved` = we genuinely do not know yet. NOT a lockout: the server
   * refuses bets and cuts video off its own answer, so a client that covers the
   * table while merely uncertain buys no safety and costs a funded player their
   * game during any backend blip. It renders as a non-blocking status pill
   * (`SeatCheckOverlay`) and must never show a money figure we did not receive.
   */
  state: "open" | "blocked" | "unresolved";
  /** The figure to display when blocked. */
  required: number;
  floor: "enter" | "keep" | null;
  seated: boolean;
}

const OPEN: SeatGate = { state: "open", required: 0, floor: null, seated: false };

/**
 * Resolve the gate. Order is the whole fix:
 *
 *  1. demo / skipped bootstrap        -> open (legacy behaviour, unchanged)
 *  2. `enforced === false`            -> open. A seamless-wallet player is
 *     gated by nobody server-side, so the client must not gate them either.
 *  3. a live stake                    -> open (the all-in exemption), from the
 *     client's own bets, or from the server snapshot while it is still current
 *  4. thresholds AND an authoritative balance from ANY source -> derive
 *  5. otherwise                       -> unresolved
 *
 * Step 4 is a PURE function of the current balance, so seeding its inputs
 * changes only WHEN it can answer, never WHAT it answers.
 */
export function resolveSeatGate(input: SeatGateInput): SeatGate {
  const { token, bootstrap, balanceLoaded, balance, hasLiveStake } = input;

  if (token === "demo" || bootstrap.status === "skipped") return OPEN;

  const decision = "seat" in bootstrap ? bootstrap.seat : null;
  if (decision && decision.enforced === false) return OPEN;

  // Money already on the table buys the seat: a player who went all-in is below
  // the floor immediately, but that stake is riding on the hand being dealt.
  // Mirrors both server exemptions (bet guard + video cut).
  if (hasLiveStake) return OPEN;
  // The server's snapshot covers the gap before the client has rehydrated its
  // own bets on a mid-round refresh — but only until that hand ends, or a lost
  // bet keeps the door open long after the money left the table.
  if (input.liveStakeSnapshotValid && decision?.live_stake) return OPEN;

  // Thresholds: table state and the seat payload publish the same
  // `get_min_seat_balance()` object, so either will do.
  const rawThresholds = input.minSeatBalance ?? decision?.thresholds ?? null;
  if (rawThresholds == null) return { ...OPEN, state: "unresolved" };

  // Balance: the live WS figure once it has spoken, else the one the server
  // used to make its decision. Never the initial 0 — a funded player must never
  // be accused of being broke by a placeholder.
  const authoritativeBalance = balanceLoaded ? balance : decision?.balance ?? null;
  if (authoritativeBalance == null) return { ...OPEN, state: "unresolved" };

  const { enter, block } = resolveMinSeatBalance(rawThresholds, input.search);

  // "Seated" means HAS PLAYED HERE, latched — not "has chips down this
  // instant". The server's `seated` is the durable answer (it survives a
  // refresh, which the client latch does not), so a server-confirmed seated
  // player gets the KEEP copy and the KEEP figure from the very first frame
  // instead of being quoted the buy-in number until their first bet lands.
  //
  // FAIL DIRECTION — and it is the SERVER'S, deliberately. Every uncertain
  // branch of `seat_service.evaluate_seat` does `seated = True  # fail toward
  // the LOWER bar, never trap a seated player`. This resolver used to do the
  // exact opposite (`decision?.seated === true`), so an unknown resolved to the
  // ENTER bar — the HIGHER one — and covered a paying player's table with a
  // modal no server agreed with. There is nothing for the client to protect by
  // guessing high: the server refuses the bet and cuts the video off its own
  // answer whatever this believes.
  //
  // And a `seated: false` we never asked for is not an answer. `evaluate_seat`
  // short-circuits when the balance IT read already cleared both floors and
  // reports `seated: false` without ever looking at prior play — so after a WS
  // balance drop that stale `false` is exactly the "unknown" above. We detect
  // that shape from the decision's own balance rather than from an internal
  // field, so it holds however the backend words the payload.
  const serverSaidSeated =
    decision == null ||
    (decision.balance != null && decision.balance >= Math.max(enter, block))
      ? null
      : decision.seated;
  const seated = input.hasPlayed || (serverSaidSeated ?? true);
  const required = seated ? block : enter;

  if (required > 0 && authoritativeBalance < required) {
    return { state: "blocked", required, floor: seated ? "keep" : "enter", seated };
  }
  return { ...OPEN, seated };
}
