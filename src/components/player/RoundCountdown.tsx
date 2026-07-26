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
        // Anchored bottom-right instead of centred: dead-centre put the dial
        // squarely over the dealer and the cards being dealt. The corner keeps
        // the countdown glanceable without covering the action.
        inset: "auto 0 0 auto",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        padding: "clamp(8px, 1.8vw, 20px)",
        pointerEvents: "none",
        opacity: show ? 1 : 0,
        transition: "opacity 0.4s ease",
        zIndex: 15,
      }}
    >
      <div
        style={{
          position: "relative",
          // Smaller than the old centrepiece — it no longer needs to read from
          // across the table, just from the corner.
          width: "min(18vw, 13vh)",
          minWidth: 66,
          maxWidth: 132,
          aspectRatio: "1 / 1",
        }}
      >
        {/* A dark disc behind the dial: at corner size the number has to stay
            legible over whatever the camera happens to be showing (bright felt,
            a dealer's white shirt), which the old low-opacity centre treatment
            no longer guarantees. */}
        <div
          style={{
            position: "absolute",
            inset: "6%",
            borderRadius: "50%",
            background: "rgba(3,7,18,0.46)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
        />
        <svg
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}
        >
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={5} />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={urgent ? "rgba(251,44,54,0.9)" : "rgba(255,255,255,0.78)"}
            strokeWidth={5}
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
            fontSize: "clamp(24px, 6.4vh, 56px)",
            fontVariantNumeric: "tabular-nums",
            color: urgent ? "rgba(255,92,100,0.98)" : "rgba(255,255,255,0.95)",
            textShadow: "0 2px 12px rgba(0,0,0,0.85)",
          }}
        >
          {remaining ?? ""}
        </div>
      </div>
    </div>
  );
}
