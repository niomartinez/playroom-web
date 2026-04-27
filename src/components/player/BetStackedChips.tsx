"use client";

import { useGame, type BetCode } from "@/lib/game-context";

const STACK_SIZE = 24;
const MAX_VISIBLE = 3;

/**
 * Renders a small chip-marker row for the given bet code.
 * Centered along the bottom of the bet button. Shows up to 3 chips,
 * one per denomination, sorted highest -> lowest, so the row stays
 * tidy regardless of how many bets the player placed on this side.
 */
export default function BetStackedChips({
  betCode,
  size = STACK_SIZE,
}: {
  betCode: BetCode;
  size?: number;
}) {
  const { stackedChips } = useGame();
  const list = stackedChips[betCode] ?? [];
  if (list.length === 0) return null;

  // One chip per denomination, sorted descending. Cap at MAX_VISIBLE so a
  // player spamming the same chip doesn't cover the bet info.
  const uniqueDenoms = Array.from(new Set(list.map((c) => c.denom))).sort((a, b) => b - a);
  const visible = uniqueDenoms.slice(0, MAX_VISIBLE);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 4,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 4,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {visible.map((denom) => (
        <img
          key={denom}
          src={`/mobile-assets/chip-${denom}.png`}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            boxShadow: "0 2px 4px rgba(0,0,0,0.45)",
          }}
        />
      ))}
    </div>
  );
}
