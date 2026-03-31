"use client";

import { useCallback } from "react";
import { useBetting } from "@/lib/use-betting";
import { useGame, type BetCode } from "@/lib/game-context";

const BETS: Array<{
  name: string;
  betCode: BetCode;
  gradient: string;
  border: string;
}> = [
  {
    name: "PLAYER",
    betCode: "BAC_Player",
    gradient: "linear-gradient(154deg, rgb(0,101,255) 0%, rgb(0,21,86) 100%)",
    border: "rgba(43,127,255,0.5)",
  },
  {
    name: "TIE",
    betCode: "BAC_Tie",
    gradient: "linear-gradient(154deg, rgb(58,161,40) 0%, rgb(0,86,16) 100%)",
    border: "rgba(0,201,80,0.5)",
  },
  {
    name: "BANKER",
    betCode: "BAC_Banker",
    gradient: "linear-gradient(154deg, rgb(217,62,64) 0%, rgb(86,0,9) 100%)",
    border: "rgba(251,44,54,0.5)",
  },
];

export default function MainBets() {
  const { placeBet, isBettingOpen, placedBets, selectedChip } = useBetting();
  const { roundStatus } = useGame();

  const handleBet = useCallback(
    async (betCode: BetCode) => {
      if (!isBettingOpen) return;
      await placeBet(betCode);
    },
    [isBettingOpen, placeBet],
  );

  return (
    <div className="grid grid-cols-3 h-full" style={{ gap: "0.4vw" }}>
      {BETS.map((bet) => {
        const myBets = placedBets.filter((b) => b.betCode === bet.betCode);
        const myTotal = myBets.reduce((sum, b) => sum + b.amount, 0);
        const disabled = !isBettingOpen;

        return (
          <button
            key={bet.name}
            onClick={() => handleBet(bet.betCode)}
            disabled={disabled}
            className="relative transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer overflow-hidden h-full flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ border: `1.6px solid ${bet.border}`, borderRadius: "0.7vw" }}
          >
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ borderRadius: "0.7vw" }}>
              <div className="absolute inset-0" style={{ backgroundImage: bet.gradient, borderRadius: "0.7vw" }} />
              <img alt="" className="absolute inset-0 w-full h-full object-cover" style={{ mixBlendMode: "color-burn", borderRadius: "0.7vw" }} src="/texture.png" />
            </div>

            <div className="relative z-10 w-full flex flex-col items-center justify-center h-full" style={{ padding: "0.4vh 0.8vw" }}>
              {/* Title centered */}
              <div className="font-bold text-white text-center" style={{ fontSize: "clamp(14px, 1.8vh, 24px)" }}>{bet.name}</div>

              {/* Bet info row */}
              <div className="flex items-center justify-between w-full text-white" style={{ fontSize: "clamp(8px, 1vh, 14px)", marginTop: "0.3vh" }}>
                <span className="font-medium opacity-80">
                  {isBettingOpen ? `+${selectedChip}` : roundStatus === "waiting" ? "---" : "Closed"}
                </span>
                <span className="font-semibold">
                  {myTotal > 0 ? `$${myTotal.toLocaleString()}` : "---"}
                </span>
              </div>

              {/* Bet count indicator */}
              {myBets.length > 0 && (
                <div className="w-full bg-white/20 rounded-full overflow-hidden" style={{ height: "clamp(3px, 0.4vh, 8px)", marginTop: "0.3vh" }}>
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: "100%" }} />
                </div>
              )}
              {myBets.length > 0 && (
                <div className="text-right w-full text-white/70" style={{ fontSize: "clamp(7px, 0.8vh, 12px)" }}>
                  {myBets.length} bet{myBets.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
