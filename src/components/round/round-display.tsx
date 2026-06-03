"use client";

/* Shared round-detail presentation, used by both the admin round page
   (/admin/rounds/[id]) and the public round page (/rounds/[id]). Keep this
   purely presentational — no data fetching, no auth. */

const SUIT_SYMBOLS: Record<string, string> = {
  H: "♥",
  D: "♦",
  C: "♣",
  S: "♠",
};
const SUIT_COLORS: Record<string, string> = {
  H: "#fb2c36",
  D: "#fb2c36",
  C: "#ffffff",
  S: "#ffffff",
};

export function CardDisplay({ card }: { card: string }) {
  const rank = card.slice(0, -1);
  const suit = card.slice(-1).toUpperCase();
  const symbol = SUIT_SYMBOLS[suit] || suit;
  const color = SUIT_COLORS[suit] || "#ffffff";

  return (
    <div
      className="inline-flex flex-col items-center justify-center rounded-lg text-sm font-bold"
      style={{
        width: 48,
        height: 68,
        backgroundColor: "#ffffff",
        border: "1px solid rgba(0,0,0,0.15)",
        color,
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      <span className="text-base leading-none">{rank}</span>
      <span className="text-lg leading-none">{symbol}</span>
    </div>
  );
}

export function resultColor(result: string | null): string {
  switch (result) {
    case "Banker":
      return "#fb2c36";
    case "Player":
      return "#2b7fff";
    case "Tie":
      return "#00bc7d";
    default:
      return "#6a7282";
  }
}

export function statusToBadge(
  status: string
): "active" | "inactive" | "pending" | "error" {
  switch (status) {
    case "settled":
      return "active";
    case "voided":
    case "cancelled":
      return "error";
    case "betting_open":
    case "dealing":
      return "pending";
    default:
      return "inactive";
  }
}

export function betStatusBadge(
  status: string
): "active" | "inactive" | "pending" | "error" {
  switch (status) {
    case "settled":
      return "active";
    case "voided":
      return "error";
    case "accepted":
      return "pending";
    default:
      return "inactive";
  }
}

interface RoundCardsProps {
  playerCards: string[] | null;
  bankerCards: string[] | null;
  playerScore: number | null;
  bankerScore: number | null;
}

/** The "Cards" panel — player and banker hands with scores. Renders nothing
    if neither hand has cards. */
export function RoundCards({
  playerCards,
  bankerCards,
  playerScore,
  bankerScore,
}: RoundCardsProps) {
  if (!playerCards && !bankerCards) return null;

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: "#171717",
        border: "1px solid rgba(208,135,0,0.2)",
      }}
    >
      <h2
        className="text-sm font-semibold uppercase tracking-wider mb-4"
        style={{ color: "#d08700" }}
      >
        Cards
      </h2>
      <div className="grid grid-cols-2 gap-6">
        {/* Player hand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold" style={{ color: "#2b7fff" }}>
              Player
            </span>
            <span
              className="inline-flex items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ width: 28, height: 28, backgroundColor: "#2b7fff" }}
            >
              {playerScore ?? "?"}
            </span>
          </div>
          <div className="flex gap-2">
            {playerCards?.map((card, i) => (
              <CardDisplay key={i} card={card} />
            ))}
          </div>
        </div>
        {/* Banker hand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold" style={{ color: "#fb2c36" }}>
              Banker
            </span>
            <span
              className="inline-flex items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ width: 28, height: 28, backgroundColor: "#fb2c36" }}
            >
              {bankerScore ?? "?"}
            </span>
          </div>
          <div className="flex gap-2">
            {bankerCards?.map((card, i) => (
              <CardDisplay key={i} card={card} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
