"use client";

import { useEffect, useRef } from "react";
import { useGame } from "./game-context";
import { sendToParent } from "./iframe-bridge";

/**
 * Kick a real-wallet player out of the table after N consecutive rounds
 * without a single bet. Counter resets whenever the player places at
 * least one bet in a round.
 *
 * On kick:
 *   1. Navigate to the `lobbyUrl` operator passed at launch, OR
 *   2. Fall back to `closeGame` postMessage to the parent iframe.
 *
 * Demo mode is exempt (`token === "demo"`) — the demo player is a
 * self-paced sandbox.
 */
const KICK_AFTER_N_IDLE_ROUNDS = 3;

export function useIdleKick() {
  const { token, roundStatus, currentRound, placedBets, lobbyUrl } = useGame();

  const idleRoundsRef = useRef(0);
  const lastRoundIdRef = useRef<string | null>(null);
  const placedThisRoundRef = useRef(false);
  const kickedRef = useRef(false);

  // Track whether at least one bet was placed during the current round.
  useEffect(() => {
    if (placedBets.length > 0) {
      placedThisRoundRef.current = true;
    }
  }, [placedBets.length]);

  // Evaluate at every transition into a fresh betting_open round.
  useEffect(() => {
    if (token === "demo" || kickedRef.current) return;
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

    // Round transitioned. Evaluate prior round's bet activity.
    if (placedThisRoundRef.current) {
      idleRoundsRef.current = 0;
    } else {
      idleRoundsRef.current += 1;
    }
    placedThisRoundRef.current = false;
    lastRoundIdRef.current = newRoundId;

    if (idleRoundsRef.current >= KICK_AFTER_N_IDLE_ROUNDS) {
      kickedRef.current = true;
      // Tell the parent first so operators that observe postMessage can
      // clean up; then navigate. If we're top-level (not iframed), the
      // postMessage is a no-op.
      try {
        sendToParent("closeGame", { reason: "idle_no_bets", rounds: idleRoundsRef.current });
      } catch {
        // ignore
      }
      if (lobbyUrl && typeof window !== "undefined") {
        // Use the operator-provided lobby URL captured at launch.
        window.location.href = lobbyUrl;
      }
    }
  }, [roundStatus, currentRound?.roundId, token, lobbyUrl]);
}
