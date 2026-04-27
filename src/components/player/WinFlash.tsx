"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/game-context";

/**
 * Total time the YOU WON overlay is visible (fade-in + hold + fade-out).
 * Kept in sync with `prgWinFlashLifecycle` keyframes so the keyframe
 * timeline below covers exactly this duration.
 */
export const WIN_FLASH_DURATION_MS = 2000;

const STYLES = `
@keyframes prgWinFlashLifecycle {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
  10%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
  20%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  90%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
}
@keyframes prgWinFlashGlow {
  0%, 100% {
    text-shadow:
      0 0 18px rgba(255, 213, 79, 0.85),
      0 0 36px rgba(255, 213, 79, 0.55);
  }
  50% {
    text-shadow:
      0 0 26px rgba(255, 213, 79, 1),
      0 0 56px rgba(255, 213, 79, 0.75);
  }
}
.prg-win-flash {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 10000;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 28px;
  border-radius: 18px;
  background: radial-gradient(circle at center, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.0) 100%);
  animation: prgWinFlashLifecycle ${WIN_FLASH_DURATION_MS}ms ease-out forwards;
}
.prg-win-flash__title {
  font-size: clamp(28px, 6vw, 56px);
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #FFD54F;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  animation: prgWinFlashGlow 1.2s ease-in-out infinite;
}
.prg-win-flash__line {
  font-size: clamp(13px, 2.4vw, 20px);
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #FFFFFF;
  text-shadow: 0 0 8px rgba(0, 188, 125, 0.55);
}
.prg-win-flash__line .label { color: rgba(255,255,255,0.85); margin-right: 8px; }
.prg-win-flash__line .amount { color: #00E396; }
`;

function formatAmount(n: number): string {
  // Render whole-dollar payoffs without decimals; show 2dp for fractional ones.
  const isWhole = Math.abs(n - Math.round(n)) < 0.005;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  });
}

/**
 * Centered "YOU WON" overlay shown for WIN_FLASH_DURATION_MS after a winning
 * settlement. Renders one line per winning bet beneath the headline. Mounted
 * once at the top of PlayerLayout (mobile + desktop).
 *
 * The actual lifecycle (clearing recentWin, dispatching the chip-back fly) is
 * orchestrated by use-balance-ws, which sets `recentWin` and clears it after
 * the duration. This component only renders.
 */
export default function WinFlash() {
  const { recentWin } = useGame();
  // Force a remount when a fresh win arrives so the CSS animation replays
  // even if two consecutive rounds have the same fightId by accident.
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    if (recentWin) setRenderKey((k) => k + 1);
  }, [recentWin]);

  if (!recentWin || recentWin.lines.length === 0) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div
        key={renderKey}
        className="prg-win-flash"
        role="status"
        aria-live="polite"
      >
        <div className="prg-win-flash__title">
          YOU WON ${formatAmount(recentWin.totalPayoff)}
        </div>
        {recentWin.lines.map((line, i) => (
          <div key={`${line.label}-${i}`} className="prg-win-flash__line">
            <span className="label">{line.label}</span>
            <span className="amount">+${formatAmount(line.amount)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
