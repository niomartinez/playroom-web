"use client";

import { useEffect, useState } from "react";
import { useGame } from "./game-context";

/**
 * Whole seconds remaining in the current betting window, or `null` when
 * betting is not open OR when we have no server-provided window to count.
 *
 * Derived from an absolute end time (computed once when the window opens)
 * rather than a decrementing counter, so every consumer — the header status
 * pill and the big centered feed overlay — renders the exact same number
 * with no drift between independently-mounted timers.
 *
 * The seconds always come from the server: `RoundStarted.countdown` (the
 * window the round was started with) or `betting_remaining_seconds` from
 * table state on refresh. We never invent one. Returning null is the honest
 * answer when we know betting is open but not for how much longer — callers
 * render the phase without a number rather than a fabricated one.
 */
export function useCountdown(): number | null {
  const { roundStatus, currentRound } = useGame();
  const [remaining, setRemaining] = useState<number | null>(null);

  const roundKey = currentRound?.roundId != null ? String(currentRound.roundId) : "";
  const configured = currentRound?.countdown;

  useEffect(() => {
    // Require a round we actually know about. The lobby_state snapshot sent
    // on WS connect carries `round_status` with no round and no timing, so
    // "betting_open" alone is not enough to start a clock: the window it
    // describes may have opened long before we connected. Defaulting to a
    // 15s guess from Date.now() meant a phantom timer counted down to 0 and
    // pinned there — the round's real BettingClosed had already fired, so
    // nothing ever arrived to clear it.
    if (roundStatus !== "betting_open" || !roundKey || configured == null) {
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
