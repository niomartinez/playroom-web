"use client";

import { useCallback } from "react";
import { useBetting } from "@/lib/use-betting";
import { useGame, type BetCode } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";
import { dispatchChipFly } from "@/lib/chip-fly";
import BetStackedChips from "./BetStackedChips";

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

// Map a UI bet code to the bucket key used in MainBetCounts payloads.
const COUNTS_KEY: Record<BetCode, "Player" | "Tie" | "Banker" | null> = {
  BAC_Player: "Player",
  BAC_Tie:    "Tie",
  BAC_Banker: "Banker",
  BAC_PlayerPair: null,
  BAC_BankerPair: null,
  BAC_EitherPair: null,
  BAC_PerfectPair: null,
};

export default function MainBets() {
  const { placeBet, isBettingOpen, isOpposingBlocked, placedBets, selectedChip } = useBetting();
  const { roundStatus, balance, addFlyingChip, mainBetCounts, currentRound } = useGame();
  const isMobile = useIsMobile();

  // Only trust the live counts when they line up with the round currently
  // displayed. After RoundClosed we deliberately KEEP the last counts (so the
  // settlement screen still shows what people bet); a stale roundId during a
  // brief reconnect window also falls through to the local-bets fallback.
  const liveCounts =
    mainBetCounts && currentRound &&
    String(mainBetCounts.roundId) === String(currentRound.roundId)
      ? mainBetCounts
      : null;

  const totalPlayers = liveCounts
    ? liveCounts.Player.players + liveCounts.Tie.players + liveCounts.Banker.players
    : 0;

  const handleBet = useCallback(
    async (betCode: BetCode, targetEl: HTMLElement | null) => {
      if (!isBettingOpen) return;
      // Snapshot the chip denom we'll animate (selectedChip can change after placeBet)
      const flyDenom = selectedChip;
      // Pre-check: don't animate if the bet would be rejected
      if (selectedChip > balance || isOpposingBlocked(betCode)) {
        await placeBet(betCode);
        return;
      }
      // Fire the fly first so origin coords come from the still-active chip.
      dispatchChipFly({ betCode, denom: flyDenom, targetEl, addFlyingChip });
      await placeBet(betCode);
    },
    [isBettingOpen, placeBet, selectedChip, balance, isOpposingBlocked, addFlyingChip],
  );

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {BETS.map((bet) => {
          const myBets = placedBets.filter((b) => b.betCode === bet.betCode);
          const myTotal = myBets.reduce((sum, b) => sum + b.amount, 0);
          const disabled = !isBettingOpen || isOpposingBlocked(bet.betCode);

          // Live aggregate across all players for this bucket. Falls back to
          // the local user's own bets when live counts aren't available
          // (demo mode or pre-WS).
          const key = COUNTS_KEY[bet.betCode];
          const liveBucket = liveCounts && key ? liveCounts[key] : null;
          const playerCount = liveBucket ? liveBucket.players : (myBets.length > 0 ? 1 : 0);
          const totalAmount = liveBucket ? liveBucket.amount : myTotal;
          const sharePct =
            liveCounts && totalPlayers > 0 && liveBucket
              ? Math.round((liveBucket.players / totalPlayers) * 100)
              : 0;

          return (
            <button
              key={bet.name}
              data-bet-code={bet.betCode}
              onClick={(e) => handleBet(bet.betCode, e.currentTarget)}
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
              <BetStackedChips betCode={bet.betCode} />
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
                  justifyContent: "space-between",
                  width: "100%",
                  height: "100%",
                  padding: "14px 10px",
                  boxSizing: "border-box",
                }}
              >
                {/* Bet name abbreviation — dominant element */}
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1,
                    letterSpacing: 0.5,
                    textShadow: "0 1px 4px rgba(0,0,0,0.35)",
                  }}
                >
                  {bet.abbrev}
                </span>

                {/* Total bet amount across all players — second most important */}
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1,
                    letterSpacing: 0.2,
                  }}
                >
                  {totalAmount > 0 ? formatCompact(totalAmount) : "$0"}
                </span>

                {/* Stats row: people icon + count, then share % */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <img
                      src="/mobile-assets/people-icon.svg"
                      alt=""
                      style={{ width: 13, height: 13 }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
                      {playerCount}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    {sharePct}%
                  </span>
                </div>

                {/* Progress bar reflects share of total players */}
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    borderRadius: 100,
                    backgroundColor: "rgba(255,255,255,0.22)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${sharePct}%`,
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

  /* ── Desktop layout ── */
  return (
    <div className="grid grid-cols-3 h-full" style={{ gap: "0.4vw" }}>
      {BETS.map((bet) => {
        const myBets = placedBets.filter((b) => b.betCode === bet.betCode);
        const myTotal = myBets.reduce((sum, b) => sum + b.amount, 0);
        const disabled = !isBettingOpen;

        // Live aggregate across all players (falls back to local bets in demo).
        const key = COUNTS_KEY[bet.betCode];
        const liveBucket = liveCounts && key ? liveCounts[key] : null;
        const playerCount = liveBucket ? liveBucket.players : (myBets.length > 0 ? 1 : 0);
        const totalAmount = liveBucket ? liveBucket.amount : myTotal;
        const sharePct =
          liveCounts && totalPlayers > 0 && liveBucket
            ? Math.round((liveBucket.players / totalPlayers) * 100)
            : 0;

        return (
          <button
            key={bet.name}
            data-bet-code={bet.betCode}
            onClick={(e) => handleBet(bet.betCode, e.currentTarget)}
            disabled={disabled}
            className="relative transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer overflow-hidden h-full flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ border: `1.6px solid ${bet.border}`, borderRadius: "0.7vw" }}
          >
            <BetStackedChips betCode={bet.betCode} size={22} />
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ borderRadius: "0.7vw" }}>
              <div className="absolute inset-0" style={{ backgroundImage: bet.gradient, borderRadius: "0.7vw" }} />
              <img alt="" className="absolute inset-0 w-full h-full object-cover" style={{ mixBlendMode: "color-burn", borderRadius: "0.7vw" }} src="/texture.png" />
            </div>

            <div className="relative z-10 w-full flex flex-col items-center justify-start h-full" style={{ padding: "0.6vh 0.8vw 3.2vh", gap: "0.3vh" }}>
              {/* Bet title */}
              <div className="font-bold text-white text-center leading-none" style={{ fontSize: "clamp(14px, 1.8vh, 24px)" }}>{bet.name}</div>

              {/* Player's own bet amount on this side -- the most important
                  number on the button. Falls back to a 1-em line when no bet
                  yet so the layout doesn't reflow when the first chip lands. */}
              <div
                className="font-extrabold text-white text-center leading-none"
                style={{
                  fontSize: "clamp(18px, 2.6vh, 32px)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.45)",
                  letterSpacing: 0.3,
                  minHeight: "2.6vh",
                }}
              >
                {myTotal > 0 ? `$${myTotal.toLocaleString()}` : isBettingOpen ? "—" : roundStatus === "waiting" ? "—" : "Closed"}
              </div>

              {/* Share-of-players bar */}
              <div className="w-full bg-white/20 rounded-full overflow-hidden" style={{ height: "clamp(3px, 0.4vh, 8px)" }}>
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${sharePct}%` }}
                />
              </div>

              {/* Player count + total bet across all players + share */}
              <div className="flex items-center justify-between w-full text-white/70" style={{ fontSize: "clamp(7px, 0.85vh, 12px)" }}>
                <span>{playerCount} player{playerCount !== 1 ? "s" : ""}</span>
                <span className="opacity-80">{totalAmount > 0 ? `$${totalAmount.toLocaleString()}` : "$0"}</span>
                <span>{sharePct}%</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
