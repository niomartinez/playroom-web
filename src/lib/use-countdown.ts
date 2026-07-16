"use client";

import { useEffect, useState } from "react";
import { useGame } from "./game-context";

/**
 * Whole seconds remaining in the current betting window, or `null` when
 * betting is not open.
 *
 * Derived from an absolute end time (computed once when the window opens)
 * rather than a decrementing counter, so every consumer — the header status
 * pill and the big centered feed overlay — renders the exact same number
 * with no drift between independently-mounted timers.
 */
export function useCountdown(): number | null {
  const { roundStatus, currentRound } = useGame();
  const [remaining, setRemaining] = useState<number | null>(null);

  const roundKey = currentRound?.roundId != null ? String(currentRound.roundId) : "";
  const configured = currentRound?.countdown ?? 15;

  useEffect(() => {
    if (roundStatus !== "betting_open") {
      setRemaining(null);
      return;
    }
    const endsAt = Date.now() + configured * 1000;
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [roundStatus, roundKey, configured]);

  return remaining;
}
