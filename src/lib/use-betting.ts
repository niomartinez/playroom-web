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

  const placeBet = useCallback(
    async (betCode: BetCode): Promise<BetResult> => {
      if (!isBettingOpen) {
        return { success: false, error: "Betting is closed" };
      }
      if (selectedChip > balance) {
        return { success: false, error: "Insufficient balance" };
      }

      if (isDemo) {
        // Demo mode: client-side only, no API call
        const bet: PlacedBet = { betCode, amount: selectedChip };
        addPlacedBet(bet);
        setBalance(balance - selectedChip);
        return { success: true };
      }

      // Real mode: call backend API
      try {
        const res = await fetch("/api/bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_token: token,
            fight_id: currentRound?.roundId,
            bet_code: betCode,
            bet_amount: selectedChip,
          }),
        });

        const data = await res.json();
        if (data.error_code && data.error_code !== "0") {
          return { success: false, error: data.message || "Bet failed" };
        }

        const bet: PlacedBet = { betCode, amount: selectedChip };
        addPlacedBet(bet);
        setBalance(balance - selectedChip);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Bet failed",
        };
      }
    },
    [isBettingOpen, isDemo, token, currentRound, selectedChip, balance, addPlacedBet, setBalance],
  );

  const totalBet = placedBets.reduce((sum, b) => sum + b.amount, 0);

  return {
    placeBet,
    isBettingOpen,
    selectedChip,
    placedBets,
    totalBet,
    balance,
  };
}
