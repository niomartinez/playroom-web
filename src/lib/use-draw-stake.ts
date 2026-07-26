"use client";

import { useRef } from "react";
import { useGame, type BetCode } from "./game-context";
import { useDrawPhase } from "./use-draw-phase";

export interface PadStake {
  /** What this player has on that side, in currency units. */
  amount: number;
  /** Denominations actually sitting on the pad, highest first. */
  denoms: number[];
}

/**
 * The player's OWN stake per bet code, frozen for the whole draw.
 *
 * Once the cards come out the pads stop showing table totals and become the
 * hand — but the player still needs to see where their money is while it plays
 * out. Reading that live off the game context does not work, because both
 * sources are torn down mid-hand:
 *
 *   - `stackedChips` is cleared on RoundClosed (and again by the fly-back).
 *   - `placedBets` is cleared by the chip-fly-back on RoundSettled.
 *
 * Both of those land BEFORE the draw phase ends (it is latched until betting
 * reopens), so a live read would show the stake during dealing and then blink
 * it away right as the result appears — exactly when you most want to see what
 * you had on.
 *
 * So: recompute only while the draw phase is OFF. The moment it latches on, the
 * ref simply stops being written and holds the last betting-window value for
 * the entire hand; the next betting window recomputes it (to empty, since the
 * new round clears the bets). No state, no effect, no teardown to get wrong —
 * the freeze is the absence of an update.
 */
export function useDrawStake(): Partial<Record<BetCode, PadStake>> {
  const { placedBets, stackedChips } = useGame();
  const drawPhase = useDrawPhase();
  const snapshot = useRef<Partial<Record<BetCode, PadStake>>>({});

  if (!drawPhase) {
    const next: Partial<Record<BetCode, PadStake>> = {};
    for (const b of placedBets) {
      const entry = (next[b.betCode] ??= { amount: 0, denoms: [] });
      entry.amount += b.amount;
    }
    for (const [code, chips] of Object.entries(stackedChips)) {
      if (!chips || chips.length === 0) continue;
      const entry = (next[code as BetCode] ??= { amount: 0, denoms: [] });
      entry.denoms = Array.from(new Set(chips.map((c) => c.denom))).sort(
        (a, b) => b - a,
      );
    }
    snapshot.current = next;
  }

  return snapshot.current;
}
