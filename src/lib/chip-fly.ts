"use client";

import type { BetCode } from "./game-context";

const FLY_SIZE = 36;

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
