"use client";

import { useGame } from "@/lib/game-context";
import { useCountdown } from "@/lib/use-countdown";

/**
 * #1 — Large, low-opacity betting countdown centered over the live feed.
 *
 * Non-interactive (`pointer-events: none`) so it never blocks the video or
 * any control beneath it, and fades out the instant betting closes. A thin
 * ring depletes alongside the number; both go red for the final 5 seconds.
 *
 * Rendered inside a `position: relative` video container (see PlayerLayout).
 */
export default function RoundCountdown() {
  const { roundStatus, currentRound } = useGame();
  const remaining = useCountdown();
  const total = currentRound?.countdown ?? 15;

  const show = roundStatus === "betting_open" && remaining !== null && remaining > 0;
  const urgent = remaining !== null && remaining <= 5;

  const R = 45;
  const CIRC = 2 * Math.PI * R;
  const frac = total > 0 ? Math.max(0, Math.min(1, (remaining ?? 0) / total)) : 0;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: show ? 1 : 0,
        transition: "opacity 0.4s ease",
        zIndex: 15,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(32vw, 20vh)",
          maxWidth: 240,
          aspectRatio: "1 / 1",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}
        >
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={urgent ? "rgba(251,44,54,0.5)" : "rgba(255,255,255,0.4)"}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - frac)}
            style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.3s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            lineHeight: 1,
            fontSize: "clamp(38px, 13vh, 116px)",
            fontVariantNumeric: "tabular-nums",
            color: urgent ? "rgba(251,44,54,0.85)" : "rgba(255,255,255,0.62)",
            textShadow: "0 2px 18px rgba(0,0,0,0.6)",
          }}
        >
          {remaining ?? ""}
        </div>
      </div>
    </div>
  );
}
