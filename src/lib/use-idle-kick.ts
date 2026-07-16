"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "./game-context";

/**
 * Idle-session policy for real-wallet players. Counts consecutive rounds with
 * no bet and escalates:
 *   - {@link WARN_1_AT} idle rounds  → warnLevel 1 ("place bets to avoid removal")
 *   - {@link WARN_2_AT} idle rounds  → warnLevel 2 ("place a bet to keep your seat")
 *   - {@link EXPIRE_AT} idle rounds  → expired (frozen "Session Expired" overlay)
 *
 * Placing at least one bet in a round resets the counter. Demo mode is exempt.
 *
 * Unlike the previous behavior, this NEVER auto-redirects or closes the tab —
 * the UI (SessionGuard) freezes the game and lets the player return manually.
 */
const WARN_1_AT = 4;
const WARN_2_AT = 5;
const EXPIRE_AT = 6;

export interface IdleSessionState {
  /** 0 = fine, 1 = first warning, 2 = final warning. */
  warnLevel: 0 | 1 | 2;
  /** True once the player has been removed for inactivity (frozen overlay). */
  expired: boolean;
}

export function useIdleSession(): IdleSessionState {
  const { token, roundStatus, currentRound, placedBets } = useGame();

  const [warnLevel, setWarnLevel] = useState<0 | 1 | 2>(0);
  const [expired, setExpired] = useState(false);

  const idleRoundsRef = useRef(0);
  const lastRoundIdRef = useRef<string | null>(null);
  const placedThisRoundRef = useRef(false);

  // Track whether at least one bet was placed during the current round.
  // Betting also clears any active warning immediately for responsive feedback.
  useEffect(() => {
    if (placedBets.length > 0) {
      placedThisRoundRef.current = true;
      setWarnLevel((w) => (w === 0 ? w : 0));
    }
  }, [placedBets.length]);

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
    if (idle >= EXPIRE_AT) {
      setExpired(true);
      setWarnLevel(0);
    } else if (idle >= WARN_2_AT) {
      setWarnLevel(2);
    } else if (idle >= WARN_1_AT) {
      setWarnLevel(1);
    } else {
      setWarnLevel(0);
    }
  }, [roundStatus, currentRound?.roundId, token, expired]);

  return { warnLevel, expired };
}
