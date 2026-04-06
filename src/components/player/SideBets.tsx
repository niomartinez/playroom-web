"use client";

import { useCallback } from "react";
import { useBetting } from "@/lib/use-betting";
import { useIsMobile } from "@/lib/use-mobile";
import type { BetCode } from "@/lib/game-context";

const SIDE_BETS: Array<{
  name: string;
  betCode: BetCode;
  odds: string;
  gradient: string;
  border: string;
  mobileGradient: string;
  mobileBorder: string;
}> = [
  {
    name: "PERFECT PAIR",
    betCode: "BAC_PerfectPair",
    odds: "25:1",
    gradient: "linear-gradient(162deg, rgb(208,135,0) 0%, rgb(137,75,0) 100%)",
    border: "rgba(208,135,0,0.5)",
    mobileGradient: "linear-gradient(137deg, #CD8400 0%, #945401 100%)",
    mobileBorder: "rgba(208,135,0,0.5)",
  },
  {
    name: "EITHER PAIR",
    betCode: "BAC_EitherPair",
    odds: "5:1",
    gradient: "linear-gradient(162deg, rgb(208,135,0) 0%, rgb(137,75,0) 100%)",
    border: "rgba(208,135,0,0.5)",
    mobileGradient: "linear-gradient(137deg, #CD8400 0%, #945401 100%)",
    mobileBorder: "rgba(208,135,0,0.5)",
  },
  {
    name: "PLAYER PAIR",
    betCode: "BAC_PlayerPair",
    odds: "11:1",
    gradient: "linear-gradient(162deg, rgb(21,93,252) 0%, rgb(25,60,184) 100%)",
    border: "rgba(43,127,255,0.5)",
    mobileGradient: "linear-gradient(137deg, #1559F4 0%, #183FBE 100%)",
    mobileBorder: "rgba(43,127,255,0.5)",
  },
  {
    name: "BANKER PAIR",
    betCode: "BAC_BankerPair",
    odds: "11:1",
    gradient: "linear-gradient(162deg, rgb(231,0,11) 0%, rgb(159,7,18) 100%)",
    border: "rgba(251,44,54,0.5)",
    mobileGradient: "linear-gradient(137deg, #E7000B 0%, #9F0712 100%)",
    mobileBorder: "rgba(251,44,54,0.5)",
  },
];

export default function SideBets() {
  const { placeBet, isBettingOpen, placedBets } = useBetting();
  const isMobile = useIsMobile();

  const handleBet = useCallback(
    async (betCode: BetCode) => {
      if (!isBettingOpen) return;
      await placeBet(betCode);
    },
    [isBettingOpen, placeBet],
  );

  if (isMobile) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {SIDE_BETS.map((bet) => {
          const hasBet = placedBets.some((b) => b.betCode === bet.betCode);
          const disabled = !isBettingOpen;

          return (
            <button
              key={bet.name}
              onClick={() => handleBet(bet.betCode)}
              disabled={disabled}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                width: 85,
                height: 79,
                borderRadius: 14,
                border: hasBet
                  ? "2px solid rgba(255,255,255,0.8)"
                  : `1.6px solid ${bet.mobileBorder}`,
                background: bet.mobileGradient,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                overflow: "hidden",
                padding: 0,
              }}
            >
              <img
                alt=""
                src="/texture.png"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  mixBlendMode: "color-burn",
                  borderRadius: 14,
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1.2,
                  }}
                >
                  {bet.name}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.9)",
                    lineHeight: 1.3,
                  }}
                >
                  {bet.odds}
                </div>
                {hasBet && (
                  <div
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 2,
                    }}
                  >
                    Bet placed
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 h-full" style={{ gap: "0.4vw" }}>
      {SIDE_BETS.map((bet) => {
        const hasBet = placedBets.some((b) => b.betCode === bet.betCode);
        const disabled = !isBettingOpen;

        return (
          <button
            key={bet.name}
            onClick={() => handleBet(bet.betCode)}
            disabled={disabled}
            className="relative text-center transition-all hover:brightness-110 active:scale-95 cursor-pointer overflow-hidden flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              border: hasBet
                ? `2px solid rgba(255,255,255,0.8)`
                : `1.6px solid ${bet.border}`,
              borderRadius: "0.7vw",
              padding: "0.6vh 0.4vw",
            }}
          >
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ borderRadius: "0.7vw" }}>
              <div className="absolute inset-0" style={{ backgroundImage: bet.gradient, borderRadius: "0.7vw" }} />
              <img alt="" className="absolute inset-0 w-full h-full object-cover" style={{ mixBlendMode: "color-burn", borderRadius: "0.7vw" }} src="/texture.png" />
            </div>
            <div className="relative z-10">
              <div className="font-bold text-white leading-tight" style={{ fontSize: "clamp(9px, 1.1vh, 16px)" }}>{bet.name}</div>
              <div className="font-medium text-white/90" style={{ fontSize: "clamp(8px, 0.9vh, 14px)" }}>{bet.odds}</div>
              {hasBet && (
                <div className="text-white/70" style={{ fontSize: "clamp(7px, 0.8vh, 12px)" }}>
                  Bet placed
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
