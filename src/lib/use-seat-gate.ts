"use client";

import { useEffect, useRef } from "react";
import { useGame } from "./game-context";
import { resolveSeatGate, type SeatBootstrap, type SeatGate } from "./seat-status";

/**
 * "Is this player seat-gated right now?" — one source of truth.
 *
 * Hoisted out of SeatBalanceGate because FOUR unrelated components need the
 * same answer and were each guessing at it:
 *
 *   - SeatBalanceGate  renders the min-balance modal.
 *   - SessionGuard     must NOT show its idle warnings / terminal expired
 *                      overlay while this is true. A player the server itself
 *                      refuses cannot bet, so charging them idle rounds and
 *                      then telling them they were removed for inactivity
 *                      names the wrong reason — and at zIndex 200 that dialog
 *                      covered the one that would have named the right one.
 *   - use-idle-kick    must freeze its own counter, not merely hide the
 *                      overlay. Hiding alone just defers the kick: the moment
 *                      the player tops up, the accumulated count lands and
 *                      they are expired instantly.
 *   - VideoPlayer      must not report a balance cut as a session end. The
 *                      edge answers a bare 401 for BOTH the idle cut and the
 *                      seat cut, and any 401 became `playroom:session-ended`
 *                      -> "Session Expired — inactivity", with zero idle rounds
 *                      elapsed. That is the fastest path to the reported
 *                      symptom and it is purely client-side.
 *
 * The module-level mirror below exists for the last of those: VideoPlayer's
 * teardown runs inside an imperative connection effect with no access to a
 * hook's render value, exactly like `idle-exempt.ts` and `session-cut.ts`.
 */

let seatGated = false;
let latchedGameId: string | null = null;
/** "Has bet at this table this page lifetime." Module-level so it survives the
 *  remounts SeatBalanceGate's ref was already guarding against — but RESET on
 *  a table change, or a player who played table A would be treated as seated on
 *  table B and held to the keep floor instead of the buy-in bar. */
let hasPlayedHere = false;

/* -- The server decision's `live_stake` is a snapshot of ONE HAND ------------
 *
 * `use-seat-status` refreshes the decision once a minute, so believing
 * `live_stake` for that whole minute re-creates the original bug: refresh
 * mid-round holding a bet, lose the hand, and the client stays open with the
 * money gone while the server has already cut the video. The snapshot is only
 * needed to bridge the gap before `useStateRecovery` rehydrates `placedBets`,
 * so it lives exactly as long as the hand it described — the client's own bets
 * take over from there.
 */
let lastSeatSeen: SeatBootstrap | null = null;
let stakeSnapshotRound: string | null = null;
let stakeSnapshotStatus: string | null = null;
let stakeSnapshotValid = false;

/** For non-React readers (VideoPlayer's imperative teardown). */
export function isSeatGated(): boolean {
  return seatGated;
}

export function useSeatGate(): SeatGate {
  const {
    token,
    gameId,
    balance,
    balanceLoaded,
    minSeatBalance,
    placedBets,
    confirmedBetRoundId,
    currentRound,
    roundStatus,
    seat,
  } = useGame();

  const roundKey =
    currentRound?.roundId != null ? String(currentRound.roundId) : null;

  // Browser only. These are module-level, and on the Node side that module is
  // shared by every concurrent SSR request — latching there would leak one
  // player's "has played" into another's render.
  if (typeof window !== "undefined") {
    if (latchedGameId !== gameId) {
      latchedGameId = gameId;
      hasPlayedHere = false;
      lastSeatSeen = null;
      stakeSnapshotValid = false;
    }
    // SERVER-CONFIRMED play only. `placedBets` includes the OPTIMISTIC chip
    // that `use-betting` rolls back when the backend refuses the bet — and this
    // latch is module-level, so it never rolled back with it. One refused bet
    // used to move the client to the keep floor permanently, which is the wrong
    // direction on a money guard. `confirmedBetRoundId` is only set once the
    // backend has accepted a bet (or `useStateRecovery` reads accepted bets
    // back off the server), and it is reset above on a table change.
    if (confirmedBetRoundId != null) hasPlayedHere = true;

    if (seat !== lastSeatSeen) {
      // A brand-new answer from the server: its `live_stake` describes the hand
      // in play right now.
      lastSeatSeen = seat;
      stakeSnapshotRound = roundKey;
      stakeSnapshotStatus = roundStatus;
      stakeSnapshotValid = true;
    } else if (
      stakeSnapshotValid &&
      (roundKey !== stakeSnapshotRound ||
        (roundStatus === "result" && stakeSnapshotStatus !== "result"))
    ) {
      // That hand is over (cards are down, or the table has moved on). Whatever
      // was riding on it has settled; only the client's own `placedBets` can
      // speak for the seat from here.
      stakeSnapshotValid = false;
    }
  }

  const gate = resolveSeatGate({
    token,
    bootstrap: seat,
    balance,
    balanceLoaded,
    minSeatBalance,
    hasPlayed: hasPlayedHere,
    // Distinct from `hasPlayed`: the all-in exemption is about money riding on
    // THIS hand, so it deliberately stays instantaneous.
    hasLiveStake: placedBets.length > 0,
    // On the SSR pass the decision was fetched microseconds ago by definition,
    // and the module-level bookkeeping above is deliberately not written there.
    // Saying "stale" would render a modal the client immediately takes back.
    liveStakeSnapshotValid:
      typeof window === "undefined" ? true : stakeSnapshotValid,
  });

  // Mirror to the module scope for imperative readers. Done in an effect, not
  // during render, so a Strict-Mode double render can't publish a value the
  // committed tree never had.
  const stateRef = useRef(gate.state);
  stateRef.current = gate.state;
  useEffect(() => {
    seatGated = stateRef.current === "blocked";
  }, [gate.state]);

  return gate;
}
