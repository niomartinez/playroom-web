"use client";

import { useGame, type BetCode } from "@/lib/game-context";

const STACK_SIZE = 28;
const STACK_OFFSET_X = 4;
const STACK_OFFSET_Y = -3;
const MAX_VISIBLE = 6;

/**
 * Renders a small stack of chip-marker images for the given bet code.
 * Anchors to its containing relatively-positioned parent (the bet button).
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

  // Show at most the last MAX_VISIBLE chips, stack visually offset.
  const visible = list.slice(-MAX_VISIBLE);
  const hiddenCount = list.length - visible.length;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 6,
        right: 6,
        width: size + (visible.length - 1) * STACK_OFFSET_X + 4,
        height: size + (visible.length - 1) * Math.abs(STACK_OFFSET_Y) + 4,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {visible.map((chip, i) => (
        <img
          key={chip.id}
          src={`/mobile-assets/chip-${chip.denom}.png`}
          alt=""
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: "50%",
            left: i * STACK_OFFSET_X,
            bottom: i * Math.abs(STACK_OFFSET_Y),
            boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}
        />
      ))}
      {hiddenCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            fontSize: 10,
            fontWeight: 700,
            color: "#fff",
            background: "rgba(0,0,0,0.7)",
            borderRadius: 8,
            padding: "1px 5px",
            lineHeight: 1.2,
          }}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
