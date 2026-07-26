"use client";

import { useGame } from "@/lib/game-context";

/**
 * The dealt cards + score, drawn INSIDE a Player or Banker bet pad.
 *
 * Evolution repurposes the pads once drawing starts: the staked totals and
 * player counts stop mattering the moment betting closes, so that space becomes
 * where the hand is shown. This is the piece that fills it.
 *
 * Deliberately self-contained and presentational — it reads the round straight
 * from context, so MainBets only decides WHEN to swap, never what a card looks
 * like.
 */

const SUIT_SYMBOLS: Record<string, string> = {
  S: "♠", H: "♥", D: "♦", C: "♣",
  s: "♠", h: "♥", d: "♦", c: "♣",
};
const RED_SUITS = new Set(["H", "D", "h", "d"]);

function parseCard(card: string): { rank: string; suit: string; isRed: boolean } {
  const suit = card.slice(-1);
  const raw = card.slice(0, -1);
  return {
    rank: raw === "T" ? "10" : raw,
    suit: SUIT_SYMBOLS[suit] || suit,
    isRed: RED_SUITS.has(suit),
  };
}

function Card({ card, compact }: { card: string; compact: boolean }) {
  const { rank, suit, isRed } = parseCard(card);
  return (
    <div
      className="bg-white rounded flex flex-col items-center justify-center font-bold shrink-0"
      style={{
        width: compact ? 22 : 26,
        height: compact ? 30 : 36,
        fontSize: compact ? 11 : 13,
        lineHeight: 1,
        color: "#0a0f1a",
        boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
        // Each card animates in on its own as it is dealt, so a third card
        // reads as an event rather than appearing silently.
        animation: "prg-pad-card-in 0.28s ease-out both",
      }}
    >
      <span>{rank}</span>
      <span style={{ color: isRed ? "#fb2c36" : "#0a0f1a" }}>{suit}</span>
    </div>
  );
}

export const PAD_CARD_KEYFRAMES = `
@keyframes prg-pad-card-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.86); }
  to   { opacity: 1; transform: none; }
}`;

export default function PadCards({
  side,
  compact = false,
}: {
  side: "player" | "banker";
  compact?: boolean;
}) {
  const { currentRound, roundStatus } = useGame();

  const cards =
    (side === "player" ? currentRound?.playerCards : currentRound?.bankerCards) ?? [];
  const score =
    (side === "player" ? currentRound?.playerScore : currentRound?.bankerScore) ?? 0;

  // Only call a winner once the round actually resolves — showing it during
  // dealing would spoil the third card.
  const winner = roundStatus === "result" ? currentRound?.winner : undefined;
  const isWinner =
    (side === "player" && winner === "P") || (side === "banker" && winner === "B");
  const isTie = winner === "T";

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 4 : 6,
        width: "100%",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        {cards.length > 0 ? (
          cards.map((c, i) => <Card key={`${c}-${i}`} card={c} compact={compact} />)
        ) : (
          // Dealing has started but this side has no card yet — hold the space
          // so the pad doesn't jump as cards land.
          <div style={{ height: compact ? 30 : 36 }} />
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontSize: compact ? 18 : 22,
            fontWeight: 900,
            lineHeight: 1,
            color: "#fff",
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 2px 6px rgba(0,0,0,0.5)",
          }}
        >
          {score}
        </span>
        {(isWinner || isTie) && (
          <span
            style={{
              fontSize: compact ? 9 : 10,
              fontWeight: 800,
              letterSpacing: 0.6,
              padding: "2px 6px",
              borderRadius: 999,
              color: "#0b0b0b",
              background: isTie ? "#00c950" : "#f0b100",
              whiteSpace: "nowrap",
            }}
          >
            {isTie ? "TIE" : "WIN"}
          </span>
        )}
      </div>
    </div>
  );
}
