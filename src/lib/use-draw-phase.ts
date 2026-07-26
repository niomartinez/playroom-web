"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "./game-context";

/**
 * "The hand is on show" — true from the moment cards start coming out until the
 * studio opens betting again.
 *
 * NOT simply `roundStatus === "dealing" || "result"`. Settlement moves the round
 * out of `result` almost immediately, which yanked the cards and the WIN badge
 * off screen a beat after they appeared — players saw a flash and had no time to
 * read the outcome, even though the studio had not reopened betting and nothing
 * else was going to happen for several seconds.
 *
 * So it LATCHES: set when dealing begins, cleared only by `betting_open`. The
 * result stays up for the whole natural pause between hands, which is exactly
 * the window players want it.
 *
 * Shared by MainBets (pads become the hand) and SideBets (collapses out of the
 * way) so the two can never disagree about which phase they are in.
 */
export function useDrawPhase(): boolean {
  const { roundStatus } = useGame();
  const [drawing, setDrawing] = useState(false);
  // Refs so the effect reads the latest value without re-subscribing.
  const drawingRef = useRef(false);
  drawingRef.current = drawing;

  useEffect(() => {
    if (roundStatus === "dealing" || roundStatus === "result") {
      if (!drawingRef.current) setDrawing(true);
      return;
    }
    // Only a fresh betting window puts the pads back. `waiting` deliberately
    // does NOT clear it — that is the post-settlement lull where the result
    // should still be readable.
    if (roundStatus === "betting_open" && drawingRef.current) {
      setDrawing(false);
    }
  }, [roundStatus]);

  return drawing;
}
