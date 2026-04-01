"use client";

import { useGame } from "@/lib/game-context";
import { useState, useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Card parsing helpers                                               */
/* ------------------------------------------------------------------ */

const SUIT_SYMBOLS: Record<string, string> = {
  H: "\u2665", D: "\u2666", C: "\u2663", S: "\u2660",
  hearts: "\u2665", diamonds: "\u2666", clubs: "\u2663", spades: "\u2660",
  h: "\u2665", d: "\u2666", c: "\u2663", s: "\u2660",
};

const SUIT_COLORS: Record<string, string> = {
  H: "#fb2c36", D: "#fb2c36", C: "#e5e7eb", S: "#e5e7eb",
  hearts: "#fb2c36", diamonds: "#fb2c36", clubs: "#e5e7eb", spades: "#e5e7eb",
  h: "#fb2c36", d: "#fb2c36", c: "#e5e7eb", s: "#e5e7eb",
};

function parseCard(card: string): { rank: string; suit: string; suitSymbol: string; color: string } {
  // Cards can be "Ah", "10s", "Kd", etc. — last char is suit
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  return {
    rank: rank.toUpperCase(),
    suit,
    suitSymbol: SUIT_SYMBOLS[suit] || suit,
    color: SUIT_COLORS[suit] || "#e5e7eb",
  };
}

/* ------------------------------------------------------------------ */
/*  Single card component with fade-in animation                       */
/* ------------------------------------------------------------------ */

function DealCard({ card, index }: { card: string; index: number }) {
  const [visible, setVisible] = useState(false);
  const { rank, suitSymbol, color } = parseCard(card);

  useEffect(() => {
    // Stagger entrance slightly per card index
    const timer = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      style={{
        width: "clamp(36px, 5vw, 56px)",
        height: "clamp(52px, 7vw, 80px)",
        backgroundColor: "#fff",
        borderRadius: "0.5vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.9)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        gap: 1,
      }}
    >
      <span
        style={{
          fontSize: "clamp(14px, 2vw, 22px)",
          fontWeight: 800,
          color: "#0a0f1a",
          lineHeight: 1,
        }}
      >
        {rank}
      </span>
      <span
        style={{
          fontSize: "clamp(12px, 1.6vw, 18px)",
          color,
          lineHeight: 1,
        }}
      >
        {suitSymbol}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty card placeholder (face-down)                                 */
/* ------------------------------------------------------------------ */

function EmptySlot() {
  return (
    <div
      style={{
        width: "clamp(36px, 5vw, 56px)",
        height: "clamp(52px, 7vw, 80px)",
        borderRadius: "0.5vw",
        border: "1.5px dashed rgba(255,255,255,0.12)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Phase banner                                                       */
/* ------------------------------------------------------------------ */

function PhaseBanner({ roundStatus, countdown }: { roundStatus: string; countdown: number | null }) {
  let text = "";
  let bgColor = "rgba(255,255,255,0.06)";
  let textColor = "#99a1af";
  let pulse = false;

  switch (roundStatus) {
    case "betting_open":
      text = countdown !== null ? `PLACE BETS  ${countdown}s` : "PLACE BETS";
      bgColor = "rgba(5,223,114,0.15)";
      textColor = "#05df72";
      pulse = true;
      break;
    case "dealing":
      text = "DEALING";
      bgColor = "rgba(240,177,0,0.15)";
      textColor = "#f0b100";
      pulse = true;
      break;
    case "result":
      text = "RESULT";
      bgColor = "rgba(251,44,54,0.15)";
      textColor = "#fb2c36";
      break;
    default:
      text = "WAITING FOR NEXT ROUND";
      break;
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 20px",
        borderRadius: 999,
        backgroundColor: bgColor,
        border: `1px solid ${textColor}33`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: textColor,
          animation: pulse ? "vizPulse 1.2s infinite" : undefined,
        }}
      />
      <span
        style={{
          fontSize: "clamp(12px, 1.6vw, 18px)",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: textColor,
        }}
      >
        {text}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main DealVisualizer                                                */
/* ------------------------------------------------------------------ */

export default function DealVisualizer() {
  const { currentRound, roundStatus } = useGame();

  const playerCards = currentRound?.playerCards ?? [];
  const bankerCards = currentRound?.bankerCards ?? [];
  const playerScore = currentRound?.playerScore ?? 0;
  const bankerScore = currentRound?.bankerScore ?? 0;
  const winner = currentRound?.winner;

  // Countdown timer that counts down from the server-sent value
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (roundStatus === "betting_open") {
      const initial = currentRound?.countdown ?? 15;
      setCountdown(initial);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundStatus, currentRound?.countdown]);

  const hasCards = playerCards.length > 0 || bankerCards.length > 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at center, #0f1520 0%, #070a10 100%)",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* Pulse animation keyframes */}
      <style>{`@keyframes vizPulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* Phase banner */}
      <div style={{ marginBottom: hasCards ? 24 : 0 }}>
        <PhaseBanner roundStatus={roundStatus} countdown={countdown} />
      </div>

      {/* Cards area — only visible when dealing or result */}
      {hasCards && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "clamp(24px, 6vw, 80px)",
            width: "100%",
            maxWidth: 700,
          }}
        >
          {/* Player side */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "clamp(11px, 1.3vw, 14px)",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#2b7fff",
                }}
              >
                PLAYER
              </span>
              <span
                style={{
                  fontSize: "clamp(20px, 3vw, 36px)",
                  fontWeight: 800,
                  color: "#2b7fff",
                }}
              >
                {playerScore}
              </span>
            </div>
            <div style={{ display: "flex", gap: "clamp(4px, 0.6vw, 8px)" }}>
              {playerCards.length > 0
                ? playerCards.map((card, i) => <DealCard key={`p-${i}-${card}`} card={card} index={i} />)
                : [0, 1].map((i) => <EmptySlot key={`pe-${i}`} />)}
            </div>
          </div>

          {/* VS separator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingTop: 32,
              fontSize: "clamp(10px, 1.2vw, 14px)",
              fontWeight: 700,
              color: "#4b5563",
              letterSpacing: "0.15em",
            }}
          >
            VS
          </div>

          {/* Banker side */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "clamp(11px, 1.3vw, 14px)",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#fb2c36",
                }}
              >
                BANKER
              </span>
              <span
                style={{
                  fontSize: "clamp(20px, 3vw, 36px)",
                  fontWeight: 800,
                  color: "#fb2c36",
                }}
              >
                {bankerScore}
              </span>
            </div>
            <div style={{ display: "flex", gap: "clamp(4px, 0.6vw, 8px)" }}>
              {bankerCards.length > 0
                ? bankerCards.map((card, i) => <DealCard key={`b-${i}-${card}`} card={card} index={i} />)
                : [0, 1].map((i) => <EmptySlot key={`be-${i}`} />)}
            </div>
          </div>
        </div>
      )}

      {/* Winner overlay */}
      {roundStatus === "result" && winner && (
        <div
          style={{
            marginTop: 20,
            padding: "8px 32px",
            borderRadius: 12,
            fontSize: "clamp(18px, 2.8vw, 32px)",
            fontWeight: 800,
            letterSpacing: "0.15em",
            color: "#fff",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            backgroundColor:
              winner === "P"
                ? "rgba(43,127,255,0.85)"
                : winner === "B"
                  ? "rgba(251,44,54,0.85)"
                  : "rgba(0,201,80,0.85)",
            animation: "vizPulse 2s ease-in-out 1",
          }}
        >
          {winner === "P" ? "PLAYER WINS" : winner === "B" ? "BANKER WINS" : "TIE"}
        </div>
      )}

      {/* Empty state — no active round */}
      {!hasCards && roundStatus === "waiting" && (
        <div style={{ marginTop: 12, fontSize: "clamp(11px, 1.3vw, 14px)", color: "#4b5563" }}>
          Waiting for next round...
        </div>
      )}
    </div>
  );
}
