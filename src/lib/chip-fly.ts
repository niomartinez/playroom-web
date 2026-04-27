"use client";

import type { BetCode } from "./game-context";

const FLY_SIZE = 36;

/**
 * Fly all currently-stacked chips on each bet button BACK to the balance area
 * (the BalanceBar's chip row). Used after a winning settlement to visually
 * "collect" the wager. The flying chips are ephemeral -- nothing lands into a
 * stack at the destination, so callers should clear the stacked-chip state
 * before/after this fires (or the stacks will visually overlap the bet button
 * during the fly).
 *
 * Returns the number of chips dispatched.
 */
export function dispatchReverseFlyToBalance(opts: {
  /** Per-bet stacked chips, mirrored from GameContext.stackedChips */
  stackedChips: Record<string, { id: string; denom: number }[]>;
  addFlyingChip: (chip: {
    denom: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    betCode: BetCode;
    /** When true, the chip does NOT land in any stack -- it dissolves at dest */
    ephemeral?: boolean;
  }) => void;
}): number {
  const { stackedChips, addFlyingChip } = opts;
  if (typeof document === "undefined") return 0;

  const balanceEl =
    (document.querySelector("[data-balance-chips]") as HTMLElement | null);
  if (!balanceEl) return 0;
  const dest = balanceEl.getBoundingClientRect();

  let dispatched = 0;
  for (const [betCode, chips] of Object.entries(stackedChips)) {
    if (!chips || chips.length === 0) continue;
    const sourceEl = document.querySelector(
      `[data-bet-code="${betCode}"]`,
    ) as HTMLElement | null;
    if (!sourceEl) continue;
    const src = sourceEl.getBoundingClientRect();

    const fromX = src.left + src.width - 22 - FLY_SIZE / 2;
    const fromY = src.top + src.height - 22 - FLY_SIZE / 2;
    const toX = dest.left + dest.width / 2 - FLY_SIZE / 2;
    const toY = dest.top + dest.height / 2 - FLY_SIZE / 2;

    for (const chip of chips) {
      addFlyingChip({
        denom: chip.denom,
        fromX,
        fromY,
        toX,
        toY,
        betCode: betCode as BetCode,
        ephemeral: true,
      });
      dispatched += 1;
    }
  }
  return dispatched;
}

/**
 * Compute source/destination viewport coordinates for a chip flying from the
 * BalanceBar's chip selector to a bet button, then dispatch via the provided
 * addFlyingChip callback.
 *
 * Returns true if the fly was dispatched, false if either source or target
 * could not be located (we fall back to a no-op so the bet still works).
 */
export function dispatchChipFly(opts: {
  betCode: BetCode;
  denom: number;
  /** The bet button element that was clicked (used as the destination rect) */
  targetEl: HTMLElement | null;
  addFlyingChip: (chip: {
    denom: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    betCode: BetCode;
  }) => void;
}): boolean {
  const { betCode, denom, targetEl, addFlyingChip } = opts;
  if (!targetEl || typeof document === "undefined") return false;

  // Find the source: the active chip in the BalanceBar matching `denom`.
  // Fall back to the chip-row container if the specific chip isn't visible.
  const sourceEl =
    (document.querySelector(
      `[data-balance-chips] [data-chip-denom="${denom}"]`,
    ) as HTMLElement | null) ??
    (document.querySelector("[data-balance-chips]") as HTMLElement | null);

  if (!sourceEl) return false;

  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  // Center the flying chip on each rect.
  const fromX = sourceRect.left + sourceRect.width / 2 - FLY_SIZE / 2;
  const fromY = sourceRect.top + sourceRect.height / 2 - FLY_SIZE / 2;
  const toX = targetRect.left + targetRect.width / 2 - FLY_SIZE / 2;
  const toY = targetRect.top + targetRect.height / 2 - FLY_SIZE / 2;

  addFlyingChip({ denom, fromX, fromY, toX, toY, betCode });
  return true;
}
