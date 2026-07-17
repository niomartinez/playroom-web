"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/game-context";
import { useT } from "@/lib/i18n";
import { formatBalance } from "@/lib/currency";

/** How long the winners list stays up after a round settles. */
const SHOW_MS = 9000;

/**
 * The last round whose winners we already showed — module-level on purpose,
 * so it SURVIVES a remount. `roundWinners` lives in context and is never
 * cleared, so a component-state guard resets to null when this unmounts
 * (a mobile/desktop breakpoint flip, e.g. rotating a phone across 640px) and
 * the effect re-fires against the stale value — replaying a round's winners
 * that settled minutes ago. A module ref outlives the remount and won't.
 */
let lastShownRoundId: string | null = null;

const STYLES = `
@keyframes prgMarqueeV {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
`;

/**
 * #6 — post-settlement winners list, a low-key vertical marquee over the top-
 * left of the live feed (screen name + net win). Fed by the system-wide
 * `RoundWinners` broadcast. Non-interactive; auto-hides after a few seconds.
 */
export default function WinnersMarquee() {
  const { roundWinners, currency } = useGame();
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!roundWinners || roundWinners.winners.length === 0) return;
    // Only show a round's winners ONCE, ever — tracked across remounts.
    if (roundWinners.roundId && roundWinners.roundId === lastShownRoundId) return;
    lastShownRoundId = roundWinners.roundId;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), SHOW_MS);
    return () => clearTimeout(id);
  }, [roundWinners]);

  if (!visible || !roundWinners || roundWinners.winners.length === 0) return null;

  const list = roundWinners.winners;
  const scroll = list.length > 4;
  // Duplicate for a seamless -50% loop when scrolling.
  const items = scroll ? [...list, ...list] : list;
  const duration = Math.max(6, list.length * 2.2);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 16,
        width: "min(46vw, 220px)",
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        overflow: "hidden",
        background: "rgba(3,7,18,0.42)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        pointerEvents: "none",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <style>{STYLES}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ fontSize: 13 }}>🏆</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "#f0b100", textTransform: "uppercase" }}>
          {t("winners.title")}
        </span>
      </div>
      <div style={{ position: "relative", overflow: "hidden", maxHeight: 148 }}>
        <div style={scroll ? { animation: `prgMarqueeV ${duration}s linear infinite` } : undefined}>
          {items.map((w, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "6px 10px",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#e5e7eb",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "58%",
                }}
              >
                {w.user}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#05df72", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {/* formatBalance, not formatMoney: the backend broadcasts the
                    NET win to the cent (a P50 banker win nets P47.50), and
                    formatMoney rounds — it showed +P48. Same defect #3 exists
                    to prevent, in a spot #3's fix didn't reach. */}
                +{formatBalance(w.amount, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
