"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "./game-context";
import { resolveIdlePolicy, type IdlePolicy } from "./idle-policy";

/**
 * Idle-session policy for real-wallet players. Counts consecutive rounds with
 * no bet and escalates per the resolved {@link IdlePolicy}:
 *   - `warn1` idle rounds  → warnLevel 1 ("place bets to avoid removal")
 *   - `warn2` idle rounds  → warnLevel 2 ("place a bet to keep your seat")
 *   - `expire` idle rounds → expired (frozen "Session Expired" overlay)
 *
 * The thresholds are SERVER-OWNED — delivered in table state (idlePolicy) and
 * resolved in `idle-policy.ts`. A QA URL override is honoured off-prod only, so
 * a production player can't lengthen or disable their own freeze via the URL.
 *
 * Placing at least one bet in a round resets the counter. Demo mode is exempt.
 *
 * Unlike the previous behavior, this NEVER auto-redirects or closes the tab —
 * the UI (SessionGuard) freezes the game and lets the player return manually.
 */

export interface IdleSessionState {
  /** 0 = fine, 1 = first warning, 2 = final warning. */
  warnLevel: 0 | 1 | 2;
  /** True once the player has been removed for inactivity (frozen overlay). */
  expired: boolean;
}

export function useIdleSession(): IdleSessionState {
  const { token, roundStatus, currentRound, placedBets, confirmedBetRoundId, idlePolicy } = useGame();

  // Resolved once per mount: reading window.location during render would
  // differ between server and client and trip hydration.
  const policyRef = useRef<IdlePolicy | null>(null);
  if (policyRef.current === null) policyRef.current = resolveIdlePolicy(idlePolicy);
  const policy = policyRef.current;

  const [warnLevel, setWarnLevel] = useState<0 | 1 | 2>(0);
  const [expired, setExpired] = useState(false);

  const idleRoundsRef = useRef(0);
  const lastRoundIdRef = useRef<string | null>(null);
  const placedThisRoundRef = useRef(false);

  // Clear an active warning the instant a chip goes down — responsive, and
  // harmless if the bet is later rejected (the warning just returns next
  // transition). This does NOT decide whether the round counts as active.
  useEffect(() => {
    if (placedBets.length > 0) {
      setWarnLevel((w) => (w === 0 ? w : 0));
    }
  }, [placedBets.length]);

  // What actually resets the idle counter: a bet the SERVER confirmed for the
  // current round. Keying off the optimistic placement let a rejected bet
  // (below min, over max, wallet 5xx) count as activity — so a player who
  // taps a rejected bet each round never idled out. With freeze now at a
  // single missed round, that gap was the whole rule.
  useEffect(() => {
    if (
      confirmedBetRoundId &&
      currentRound?.roundId != null &&
      String(currentRound.roundId) === confirmedBetRoundId
    ) {
      placedThisRoundRef.current = true;
    }
  }, [confirmedBetRoundId, currentRound?.roundId]);

  // Evaluate at every transition into a fresh betting_open round.
  useEffect(() => {
    if (token === "demo" || expired) return;
    if (roundStatus !== "betting_open" || !currentRound?.roundId) return;

    const newRoundId = String(currentRound.roundId);
    const prevRoundId = lastRoundIdRef.current;

    // First round we observe — just record it, don't count.
    if (!prevRoundId) {
      lastRoundIdRef.current = newRoundId;
      placedThisRoundRef.current = false;
      return;
    }

    // Same round (re-trigger) — ignore.
    if (prevRoundId === newRoundId) return;

    // Round transitioned. Evaluate the prior round's bet activity.
    if (placedThisRoundRef.current) {
      idleRoundsRef.current = 0;
    } else {
      idleRoundsRef.current += 1;
    }
    placedThisRoundRef.current = false;
    lastRoundIdRef.current = newRoundId;

    const idle = idleRoundsRef.current;
    if (idle >= policy.expire) {
      setExpired(true);
      setWarnLevel(0);
    } else if (policy.warn2 !== null && idle >= policy.warn2) {
      setWarnLevel(2);
    } else if (policy.warn1 !== null && idle >= policy.warn1) {
      setWarnLevel(1);
    } else {
      setWarnLevel(0);
    }
  }, [roundStatus, currentRound?.roundId, token, expired, policy]);

  return { warnLevel, expired };
}
