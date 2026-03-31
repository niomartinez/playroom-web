"use client";

import { useCallback } from "react";
import { useGame, type BetCode, type PlacedBet } from "./game-context";
import { clientFetch } from "./api";

export interface BetResult {
  success: boolean;
  error?: string;
}

/**
 * Hook for placing bets. Returns helpers to place bets
 * and read current bet state from context.
 */
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

  const placeBet = useCallback(
    async (betCode: BetCode): Promise<BetResult> => {
      if (!isBettingOpen) {
        return { success: false, error: "Betting is closed" };
      }
      if (!token) {
        return { success: false, error: "No session token" };
      }
      if (!currentRound) {
        return { success: false, error: "No active round" };
      }
      if (selectedChip > balance) {
        return { success: false, error: "Insufficient balance" };
      }

      try {
        const res = await clientFetch("/api/bet", {
          method: "POST",
          body: JSON.stringify({
            session_token: token,
            fight_id: currentRound.roundId,
            bet_code: betCode,
            amount: selectedChip,
          }),
        });

        if (res.error) {
          return { success: false, error: res.error };
        }

        const bet: PlacedBet = { betCode, amount: selectedChip };
        addPlacedBet(bet);

        // Optimistically deduct balance (WS will send authoritative update)
        setBalance(balance - selectedChip);

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Bet failed",
        };
      }
    },
    [isBettingOpen, token, currentRound, selectedChip, balance, addPlacedBet, setBalance],
  );

  /** Total amount bet this round. */
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
