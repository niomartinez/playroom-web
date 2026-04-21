"use client";

import { useCallback } from "react";
import { useBetting } from "@/lib/use-betting";
import { useGame, type BetCode } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";

const BETS: Array<{
  name: string;
  abbrev: string;
  betCode: BetCode;
  gradient: string;
  border: string;
  mobileGradient: string;
  mobileBorder: string;
}> = [
  {
    name: "PLAYER",
    abbrev: "P",
    betCode: "BAC_Player",
    gradient: "linear-gradient(154deg, rgb(0,101,255) 0%, rgb(0,21,86) 100%)",
    border: "rgba(43,127,255,0.5)",
    mobileGradient: "linear-gradient(126.5deg, #0065FF 0%, #001556 100%)",
    mobileBorder: "rgba(43,127,255,0.5)",
  },
  {
    name: "TIE",
    abbrev: "T",
    betCode: "BAC_Tie",
    gradient: "linear-gradient(154deg, rgb(58,161,40) 0%, rgb(0,86,16) 100%)",
    border: "rgba(0,201,80,0.5)",
    mobileGradient: "linear-gradient(126.5deg, #3AA128 0%, #005610 100%)",
    mobileBorder: "rgba(0,201,80,0.5)",
  },
  {
    name: "BANKER",
    abbrev: "B",
    betCode: "BAC_Banker",
    gradient: "linear-gradient(154deg, rgb(217,62,64) 0%, rgb(86,0,9) 100%)",
    border: "rgba(251,44,54,0.5)",
    mobileGradient: "linear-gradient(126.5deg, #D93E40 0%, #560009 100%)",
    mobileBorder: "rgba(251,44,54,0.5)",
  },
];

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 0)}K`;
  return `$${amount}`;
}

export default function MainBets() {
  const { placeBet, isBettingOpen, isOpposingBlocked, placedBets, selectedChip } = useBetting();
  const { roundStatus } = useGame();
  const isMobile = useIsMobile();

  const handleBet = useCallback(
    async (betCode: BetCode) => {
      if (!isBettingOpen) return;
      await placeBet(betCode);
    },
    [isBettingOpen, placeBet],
  );

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {BETS.map((bet) => {
          const myBets = placedBets.filter((b) => b.betCode === bet.betCode);
          const myTotal = myBets.reduce((sum, b) => sum + b.amount, 0);
          const disabled = !isBettingOpen || isOpposingBlocked(bet.betCode);
          const winPct = bet.betCode === "BAC_Tie" ? 9 : bet.betCode === "BAC_Player" ? 47 : 44;

          return (
            <button
              key={bet.name}
              onClick={() => handleBet(bet.betCode)}
              disabled={disabled}
              style={{
                position: "relative",
                height: 155,
                borderRadius: 14,
                border: `1.6px solid ${bet.mobileBorder}`,
                background: bet.mobileGradient,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                padding: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {/* Marble texture overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "url(/mobile-assets/bet-card-texture.png)",
                  backgroundSize: "cover",
                  mixBlendMode: "color-burn",
                  opacity: 0.3,
                  borderRadius: 14,
                  pointerEvents: "none",
                }}
              />

              {/* Card content */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  padding: "12px 8px",
                  boxSizing: "border-box",
                  gap: 4,
                }}
              >
                {/* Bet name abbreviation */}
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  {bet.abbrev}
                </span>

                {/* People icon + bet count */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <img
                    src="/mobile-assets/people-icon.svg"
                    alt=""
                    style={{ width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>
                    {myBets.length}
                  </span>
                </div>

                {/* Bet amount */}
                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                  {myTotal > 0 ? formatCompact(myTotal) : "$0"}
                </span>

                {/* Win percentage */}
                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>
                  {winPct}%
                </span>

                {/* Progress bar */}
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    borderRadius: 100,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${winPct}%`,
                      height: "100%",
                      borderRadius: 100,
                      backgroundColor: "#fff",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  /* ── Desktop layout (unchanged) ── */
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
