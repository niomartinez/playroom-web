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
    setBalance,
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
      // confirms (debit) or rejects the bet.
      const bet: PlacedBet = { betCode, amount: selectedChip };
      addPlacedBet(bet);
      setBalance(balance - selectedChip);

      if (isDemo) {
        return { success: true };
      }

      // Fire-and-forget — UI doesn't block on the network round-trip.
      // On failure, the canonical balance comes back via the WS push.
      fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: token,
          fight_id: currentRound?.roundId,
          bet_code: betCode,
          bet_amount: selectedChip,
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || (data.error_code && data.error_code !== "0")) {
            console.warn("Bet rejected by backend:", data.message || res.statusText);
          }
        })
        .catch((err) => {
          console.warn("Bet request failed:", err);
        });

      return { success: true };
    },
    [isBettingOpen, isDemo, isOpposingBlocked, token, currentRound, selectedChip, balance, addPlacedBet, setBalance],
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
