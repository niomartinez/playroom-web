"use client";

import { useCallback, useRef } from "react";
import { useGame, type BetCode, type PlacedBet } from "./game-context";
import { beginBetMove, endBetMove } from "./bet-move";
import { formatBalance } from "./currency";

export interface BetResult {
  success: boolean;
  error?: string;
}

export function useBetting() {
  const {
    token,
    currentRound,
    roundStatus,
    selectedChip,
    placedBets,
    balance,
    maxBet,
    currency,
    addPlacedBet,
    removePlacedBet,
    setBalance,
    popStackedChip,
    addStackedChip,
    moveStackedChips,
    stackedChips,
  } = useGame();

  const isBettingOpen = roundStatus === "betting_open";
  const isDemo = token === "demo";

  // Guards against a second drag starting while one is still in flight.
  // A ref, not state: the check and the set must be atomic within one
  // handler, and a re-render between them would let both moves through.
  const moveInFlightRef = useRef(false);

  // Check if a bet code is blocked due to opposing bet rule
  const isOpposingBlocked = useCallback(
    (betCode: BetCode): boolean => {
      const opposites: Record<string, string[]> = {
        BAC_Player: ["BAC_Banker", "BAC_BANKER"],
        BAC_PLAYER: ["BAC_Banker", "BAC_BANKER"],
        BAC_Banker: ["BAC_Player", "BAC_PLAYER"],
        BAC_BANKER: ["BAC_Player", "BAC_PLAYER"],
      };
      const blocked = opposites[betCode];
      if (!blocked) return false;
      return placedBets.some((b) => blocked.includes(b.betCode));
    },
    [placedBets],
  );

  const placeBet = useCallback(
    async (betCode: BetCode): Promise<BetResult> => {
      if (!isBettingOpen) {
        return { success: false, error: "Betting is closed" };
      }
      // Check the table ceiling BEFORE the optimistic debit. The backend caps
      // each bet at max_bet, so a chip over it is rejected — and if we debit
      // first and roll back after the round-trip, the balance visibly crawls
      // down and then back up, reading as money lost and returned. Refuse it
      // up front instead: no debit, no crawl, just the reason.
      if (maxBet != null && maxBet > 0 && selectedChip > maxBet) {
        return {
          success: false,
          error: `Max bet is ${formatBalance(maxBet, currency)} on this table`,
        };
      }
      if (selectedChip > balance) {
        return { success: false, error: "Not enough balance for that chip" };
      }
      if (isOpposingBlocked(betCode)) {
        return {
          success: false,
          error: "You can't bet Player and Banker in the same round",
        };
      }

      // Optimistic UI: deduct + place chip immediately so the click feels snappy.
      // The balance WS reconciles to the canonical value once the backend
      // confirms (debit) or rejects the bet. We tag the placement with a
      // transient id so we can roll it back if the server rejects.
      const betId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const chipAmount = selectedChip;
      const bet: PlacedBet = { id: betId, betCode, amount: chipAmount };
      addPlacedBet(bet);
      setBalance((b) => b - chipAmount);

      if (isDemo) {
        return { success: true };
      }

      const rollback = (reason: string) => {
        console.warn("Bet rejected by backend, rolling back:", reason);
        removePlacedBet(betId);
        // Functional setter avoids stale-closure double-counting when the
        // user spams bets faster than React commits.
        setBalance((b) => b + chipAmount);
        // Also pop the visible chip stack — the chip-fly animation already
        // landed a marker on the bet button, but the bet itself didn't
        // make it server-side, so the visible chip would otherwise be a
        // ghost. Pops the most-recently-added chip for this bet code.
        popStackedChip(betCode);
      };

      // Fire-and-forget — UI doesn't block on the network round-trip.
      // On rejection we roll back the optimistic placedBet + balance so the
      // local total never drifts above what the server actually accepted.
      // (We deliberately do NOT roll back the visual chip stack here; it
      // clears at round end via existing logic, and the user-visible bug was
      // the AMOUNT, not the chip image.)
      // F-10 follow-up: do NOT send session_token in the body — the
      // HttpOnly prg_session cookie is automatically sent on this
      // same-origin fetch, and the /api/bet proxy reads the token from
      // there. Keeps the token out of any client-visible payload.
      fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fight_id: currentRound?.roundId,
          bet_code: betCode,
          bet_amount: chipAmount,
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || (data.error_code && data.error_code !== "0")) {
            rollback(data.message || res.statusText || "rejected");
          }
        })
        .catch((err) => {
          rollback(err instanceof Error ? err.message : String(err));
        });

      return { success: true };
    },
    [isBettingOpen, isDemo, isOpposingBlocked, token, currentRound, selectedChip, balance, maxBet, currency, addPlacedBet, removePlacedBet, setBalance, popStackedChip],
  );

  /**
   * #2 — drag-to-move a MAIN bet from one pad to another. Side bets are never
   * touched. Balance is net-zero, so no wallet->pad chip is animated; the
   * chips simply relocate. Betting-open only.
   *
   * ONE server call. This used to be a client-side void-then-place pair, and
   * the gap between them was a way to lose real money:
   *
   *  - A void that found nothing (the source bet was still in flight from a
   *    tap a moment earlier) came back as SUCCESS, so we placed the target
   *    and the original bet then landed — the player held two live bets,
   *    double-debited, with only one on screen.
   *  - Source voided but replacement rejected (over max as a consolidated
   *    single bet, betting closed, opposing rule, network drop) → the round
   *    was played with no bet at all, silently.
   *
   * /api/bet/move does both halves under one lock, validates the total
   * against the target's limits BEFORE voiding anything, and returns a real
   * error when the source isn't on the books.
   */
  const moveMainBet = useCallback(
    async (fromCode: BetCode, toCode: BetCode): Promise<BetResult> => {
      if (!isBettingOpen) return { success: false, error: "Betting is closed" };
      if (fromCode === toCode) return { success: false, error: "Same pad" };
      // Serialise moves. Two overlapping drags raced each other's void the
      // same way a drag races a tap, and the second one's void found the
      // first one's bet missing.
      if (moveInFlightRef.current) return { success: false, error: "Move already in progress" };

      const fromBets = placedBets.filter((b) => b.betCode === fromCode);
      const total = fromBets.reduce((s, b) => s + b.amount, 0);
      if (total <= 0) return { success: false, error: "No bet to move" };
      // A move consolidates the whole pad into ONE bet, so a stack that was
      // fine as several taps can exceed the table max as a single bet. Catch
      // it here for an instant, clean message — the server enforces it too
      // (and does so before voiding anything, so nothing is lost either way),
      // but the round-trip error box is what looked broken.
      if (maxBet != null && maxBet > 0 && total > maxBet) {
        return {
          success: false,
          error: `Max bet is ${formatBalance(maxBet, currency)} — that stack is ${formatBalance(total, currency)}`,
        };
      }

      const srcChips = [...(stackedChips[fromCode] ?? [])];
      const movedChipCount = srcChips.length;
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `move-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Optimistic reposition (money moves pad->pad, so balance is net-zero).
      fromBets.forEach((b) => {
        if (b.id) removePlacedBet(b.id);
      });
      addPlacedBet({ id: newId, betCode: toCode, amount: total });
      moveStackedChips(fromCode, toCode);

      if (isDemo) return { success: true };

      const fightId = currentRound?.roundId;

      // Put the chips back exactly where they were. The server either moved
      // the bet or it didn't — there is no half-done state to reconcile now
      // that the move is atomic, so every failure restores the source.
      const restoreSource = () => {
        removePlacedBet(newId);
        for (let i = 0; i < movedChipCount; i++) popStackedChip(toCode);
        fromBets.forEach((b) => addPlacedBet(b));
        srcChips.forEach((c) => addStackedChip(fromCode, c.denom));
      };

      // Hold balance pushes for the duration: the server ledgers a move as a
      // refund of the source plus a debit of the replacement, and applying
      // each as it landed made the balance crawl up by the stake and back
      // down — reading as a payout followed by a fresh deduction.
      moveInFlightRef.current = true;
      beginBetMove();
      try {
        const res = await fetch("/api/bet/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fight_id: fightId,
            from_code: fromCode,
            to_code: toCode,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data.error_code && data.error_code !== "0")) {
          restoreSource();
          return { success: false, error: data.message || "Move failed" };
        }
        return { success: true };
      } catch (err) {
        // The request may or may not have reached the server. Restore the
        // visible source and let state recovery reconcile on next mount —
        // the atomic move means the server is in one of two clean states.
        restoreSource();
        return { success: false, error: err instanceof Error ? err.message : "Move failed" };
      } finally {
        moveInFlightRef.current = false;
        // Runs on every path — a held balance must never be stranded, or the
        // displayed balance stops tracking the server for the rest of the
        // session.
        endBetMove((b) => setBalance(b));
      }
    },
    [
      isBettingOpen,
      isDemo,
      placedBets,
      stackedChips,
      currentRound,
      addPlacedBet,
      removePlacedBet,
      moveStackedChips,
      popStackedChip,
      addStackedChip,
      setBalance,
      maxBet,
      currency,
    ],
  );

  const totalBet = placedBets.reduce((sum, b) => sum + b.amount, 0);

  return {
    placeBet,
    moveMainBet,
    isBettingOpen,
    isOpposingBlocked,
    selectedChip,
    placedBets,
    totalBet,
    balance,
  };
}
