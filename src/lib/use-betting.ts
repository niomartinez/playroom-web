"use client";

import { useCallback } from "react";
import { useGame, type BetCode, type PlacedBet } from "./game-context";

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
    addPlacedBet,
    removePlacedBet,
    setBalance,
    popStackedChip,
  } = useGame();

  const isBettingOpen = roundStatus === "betting_open";
  const isDemo = token === "demo";

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
      if (selectedChip > balance) {
        return { success: false, error: "Insufficient balance" };
      }
      if (isOpposingBlocked(betCode)) {
        return { success: false, error: "Opposing bets are not allowed" };
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
    [isBettingOpen, isDemo, isOpposingBlocked, token, currentRound, selectedChip, balance, addPlacedBet, removePlacedBet, setBalance, popStackedChip],
  );

  const totalBet = placedBets.reduce((sum, b) => sum + b.amount, 0);

  return {
    placeBet,
    isBettingOpen,
    isOpposingBlocked,
    selectedChip,
    placedBets,
    totalBet,
    balance,
  };
}
