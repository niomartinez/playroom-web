"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-context";
import { useT } from "@/lib/i18n";
import { useSeatWarn } from "@/lib/use-seat-warn";

/**
 * Pulsing chrome, not pulsing text: the copy has to stay readable for the whole
 * 1.2s cycle, so the animation moves the glow and the border and leaves the
 * letters alone. Same rhythm as the desktop balance pulse in BalanceBar, so a
 * player switching devices sees one behaviour.
 *
 * ::after is the tail — a rotated square poking out of the bottom edge, aimed
 * at the "Balance ₱x" line sitting directly beneath it in the strip.
 */
const SEAT_WARN_BUBBLE_STYLES = `
@keyframes prg-seat-warn-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251,44,54,0); border-color: rgba(251,44,54,0.45); }
  50% { box-shadow: 0 0 14px 2px rgba(251,44,54,0.4); border-color: rgba(251,44,54,0.95); }
}
.prg-seat-warn {
  background: #2a0b10;
  border: 1px solid rgba(251,44,54,0.65);
  animation: prg-seat-warn-pulse 1.2s ease-in-out infinite;
}
.prg-seat-warn::after {
  content: "";
  position: absolute;
  left: 14px;
  bottom: -5px;
  width: 8px;
  height: 8px;
  background: #2a0b10;
  border-right: 1px solid rgba(251,44,54,0.65);
  border-bottom: 1px solid rgba(251,44,54,0.65);
  transform: rotate(45deg);
}
@media (prefers-reduced-motion: reduce) {
  .prg-seat-warn { animation: none; border-color: rgba(251,44,54,0.85); }
}
`;

/**
 * The mobile low-balance nudge.
 *
 * Rendered as an absolutely positioned child of the pinned TableInfoBar, which
 * is the strip that actually holds the mobile balance figure. Being out of flow
 * is the whole point: the warning used to be a block row inside the bet panel,
 * so the instant the balance crossed the band it inserted ~20px of height and
 * pushed SideBets and MainBets down — moving the pads under a thumb that was
 * already on its way to a chip. Out of flow, it cannot move anything.
 *
 * `bottom: 100%` against the strip means "immediately above it" with no measured
 * offset, so it stays correct as the safe-area inset and the clamp()ed font
 * change the strip's height. `left: 10` matches the strip's own padding, which
 * lines the bubble's left edge (and its tail) up with the balance line.
 *
 * Stacking: it inherits the strip's zIndex 60 context — above page content,
 * below MobileChat's sheet (100) and below SeatBalanceGate/SessionGuard
 * (190/200). That order is deliberate: a player who is BLOCKED must see the
 * block modal, never this. It also means the bubble can never be raised above
 * the chat sheet without moving it out of the strip.
 */
export default function SeatWarnBubble() {
  const { currentRound } = useGame();
  const { warnLow, text } = useSeatWarn();
  const t = useT();

  /**
   * Dismiss is per ROUND, and the re-arm signal is the round id — the lobby WS
   * force-replaces the whole round object on RoundStarted, so it changes
   * exactly once per hand. Deliberately NOT roundStatus: that cycles
   * waiting → betting_open → dealing → result inside a single round (and is
   * re-set on reconnect), which would pop the bubble back two or three times
   * per hand and make the × feel broken.
   *
   * Plain state, not a ref or localStorage: a dismissal should not outlive a
   * reload — a fresh page is a fresh look at the balance.
   */
  const roundKey = String(currentRound?.roundId ?? "");
  const [dismissedRound, setDismissedRound] = useState<string | null>(null);

  if (!warnLow || dismissedRound === roundKey) return null;

  return (
    <div
      className="prg-seat-warn"
      role="status"
      data-seat-warn=""
      style={{
        position: "absolute",
        left: 10,
        bottom: "100%",
        marginBottom: 6,
        maxWidth: "min(72vw, 300px)",
        borderRadius: 10,
        padding: "8px 32px 8px 10px",
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        color: "#ffd0d3",
        // Stays pointer-transparent, like the strip that hosts it. This box is
        // up to min(72vw, 300px) wide and floats over the bottom-LEFT of the
        // content area — the exact cell PlayerLayout gives MobileChat. Making
        // the whole bubble interactive turned every one of those pixels into a
        // dead zone that ate taps meant for the chat. Explicit rather than
        // inherited: the value only has to survive one re-parent to matter.
        // The × below is the single deliberate exception.
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <style>{SEAT_WARN_BUBBLE_STYLES}</style>
      {text}
      <button
        type="button"
        onClick={() => setDismissedRound(roundKey)}
        aria-label={t("seat.warnDismiss")}
        title={t("seat.warnDismiss")}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          padding: 0,
          color: "rgba(255,255,255,0.62)",
          fontSize: 15,
          lineHeight: 1,
          // The one island that re-enables hit-testing — a nudge the player
          // cannot close is not a nudge. 32×32 is a real thumb target, and it
          // is all that is carved out of the strip's pointerEvents:none.
          pointerEvents: "auto",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        ×
      </button>
    </div>
  );
}
