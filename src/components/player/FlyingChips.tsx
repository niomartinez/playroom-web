"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/game-context";

const FLY_DURATION_MS = 400;
const FLY_SIZE = 36;

/**
 * Renders an absolutely-positioned chip image for each in-flight chip in
 * GameContext.flyingChips. On mount we kick off a transform transition from
 * the source rect to the destination rect; once it ends we add the chip to
 * the per-bet stacked-chip map and remove the flyer.
 *
 * Mounted once at the top of the player layout.
 */
export default function FlyingChips() {
  const { flyingChips } = useGame();

  if (flyingChips.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {flyingChips.map((chip) => (
        <FlyingChip key={chip.id} chip={chip} />
      ))}
    </div>
  );
}

interface FlyingChipProps {
  chip: {
    id: string;
    denom: number;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    betCode:
      | "BAC_Player"
      | "BAC_Banker"
      | "BAC_Tie"
      | "BAC_PlayerPair"
      | "BAC_BankerPair"
      | "BAC_EitherPair"
      | "BAC_PerfectPair";
    /** Reverse-fly chips do not accumulate into a stack on landing */
    ephemeral?: boolean;
  };
}

function FlyingChip({ chip }: FlyingChipProps) {
  const { addStackedChip, removeFlyingChip } = useGame();
  // Two-phase animation: start at origin, then transition to destination.
  const [phase, setPhase] = useState<"start" | "end">("start");

  useEffect(() => {
    // Next animation frame, switch to "end" so the transition runs.
    const raf = requestAnimationFrame(() => {
      setPhase("end");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    // After the transition finishes, either land the chip into the stack
    // (forward fly) or just remove the in-flight node (reverse/ephemeral fly).
    const timer = setTimeout(() => {
      if (!chip.ephemeral) {
        addStackedChip(chip.betCode, chip.denom);
      }
      removeFlyingChip(chip.id);
    }, FLY_DURATION_MS + 16);
    return () => clearTimeout(timer);
  }, [chip.id, chip.betCode, chip.denom, chip.ephemeral, addStackedChip, removeFlyingChip]);

  const x = phase === "start" ? chip.fromX : chip.toX;
  const y = phase === "start" ? chip.fromY : chip.toY;

  return (
    <img
      src={`/mobile-assets/chip-${chip.denom}.png`}
      alt=""
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: FLY_SIZE,
        height: FLY_SIZE,
        borderRadius: "50%",
        transform: `translate(${x}px, ${y}px)`,
        transition:
          phase === "start"
            ? "none"
            : `transform ${FLY_DURATION_MS}ms cubic-bezier(0.22, 0.8, 0.34, 1)`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        willChange: "transform",
      }}
    />
  );
}
