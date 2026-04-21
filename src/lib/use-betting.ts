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
