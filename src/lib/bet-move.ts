"use client";

/**
 * Balance-push suppression for the duration of a drag-to-move (#2).
 *
 * A move is net-zero for the player: the same money leaves one pad and lands
 * on another. But the server can't express it in one push — it refunds the
 * source (`reason: "void_refund"`) and then debits the replacement
 * (`reason: "debit"`), as two separate balance events. use-balance-ws applies
 * each one as it arrives, and BalanceBar animates every change it sees, so a
 * player who merely dragged a chip watched their balance crawl *up* by the
 * stake and then crawl back *down* — reading exactly like a payout followed
 * by a fresh deduction.
 *
 * So while a move is in flight we hold the pushes instead of applying them,
 * and apply only the last one once the move settles. Holding (rather than
 * discarding) is what keeps a *failed* move honest: if the void refunded but
 * the replacement never landed, the final held balance is the refunded one,
 * and the player must see that money come back.
 *
 * Module-level rather than context state on purpose: use-balance-ws's message
 * handler reads this from inside a WebSocket callback, where a React value
 * would be a stale closure. Same pattern as `media-prefs`.
 */

let inFlight = 0;
let held: number | null = null;

/** Call when a move starts. Balance pushes are held until it settles. */
export function beginBetMove(): void {
  inFlight++;
}

/**
 * Call when a move settles (success OR failure). When the last concurrent
 * move finishes, the most recent held balance is handed to `apply` so the
 * client lands on whatever the server actually ended up with.
 */
export function endBetMove(apply: (balance: number) => void): void {
  inFlight = Math.max(0, inFlight - 1);
  if (inFlight > 0) return;
  if (held !== null) {
    const balance = held;
    held = null;
    apply(balance);
  }
}

export function isBetMoveInFlight(): boolean {
  return inFlight > 0;
}

/** Record a balance push that arrived mid-move, superseding any earlier one. */
export function holdMoveBalance(balance: number): void {
  held = balance;
}
