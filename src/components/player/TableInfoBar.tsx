"use client";

import { useGame } from "@/lib/game-context";
import { useT } from "@/lib/i18n";
import { formatMoney, symbolFor } from "@/lib/currency";

/**
 * The strip under the table, modelled on Evolution's.
 *
 *   left   Total Bet + Balance
 *   right  round id, then table name and its limits
 *
 * It replaces three scattered pieces at once: the balance that used to sit in
 * the mobile chip row (crowding the chips), the round number that used to sit in
 * the top nav, and the table name that only appeared in the desktop header. One
 * quiet line at the bottom is where players already look for all three, and it
 * keeps the header free of anything that competes with the video.
 *
 * Deliberately non-interactive and low-contrast: it is reference information,
 * not a control, so it must never pull attention off the felt.
 *
 * `fixed` pins it to the bottom of the VIEWPORT (mobile, where the page
 * scrolls). Without it the strip would sit at the end of the scroll and only
 * appear after scrolling past the score cards — the balance has to be glanceable
 * mid-hand. Desktop passes nothing: there it is the last row of a full-height
 * grid, already at the bottom of the screen.
 */
export default function TableInfoBar({ fixed = false }: { fixed?: boolean }) {
  const {
    balance,
    balanceLoaded,
    currency,
    placedBets,
    tableName,
    minBet,
    maxBet,
    currentRound,
    token,
  } = useGame();
  const t = useT();

  // The round's staked total — the sum of what is actually on the table now.
  // Recomputed from placedBets rather than tracked separately so it can never
  // drift from the chips the player can see.
  const totalBet = placedBets.reduce((sum, b) => sum + (b.amount || 0), 0);

  // Evolution shows a short round reference, not the full internal id. Our
  // roundNumber is sometimes "ROUND-1234…" — trim it to the meaningful tail so a
  // player can quote it in a dispute without reading a UUID aloud.
  const roundRef = (() => {
    const raw = currentRound?.roundNumber ?? currentRound?.roundId;
    if (raw == null) return null;
    const s = String(raw);
    return s.startsWith("ROUND-") ? s.slice(6) : s;
  })();

  const limits =
    minBet != null && maxBet != null
      ? `${symbolFor(currency)}${minBet.toLocaleString()} – ${maxBet.toLocaleString()}`
      : null;

  const label = { color: "#6a7282" } as const;
  const value = { color: "#f0b100", fontWeight: 700 } as const;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "4px 10px",
        fontSize: "clamp(10px, 1.5vh, 12px)",
        lineHeight: 1.35,
        background: fixed ? "rgba(3,7,18,0.92)" : "rgba(3,7,18,0.55)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        ...(fixed
          ? ({
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 60,
              // Clear the iOS home indicator.
              paddingBottom: "calc(4px + env(safe-area-inset-bottom, 0px))",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            } as const)
          : null),
        // Reference text, never a tap target — must not intercept a mis-aimed
        // chip placement near the bottom of the screen.
        pointerEvents: "none",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* Left: the player's own money */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ whiteSpace: "nowrap" }}>
          <span style={label}>{t("info.totalBet")} </span>
          <span style={value}>{formatMoney(totalBet, currency)}</span>
        </span>
        {token !== "demo" && (
          <span style={{ whiteSpace: "nowrap" }}>
            <span style={label}>{t("info.balance")} </span>
            <span style={value}>
              {balanceLoaded ? formatMoney(balance, currency) : "—"}
            </span>
          </span>
        )}
      </div>

      {/* Right: where you are and what round */}
      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          textAlign: "right",
        }}
      >
        {roundRef && (
          <span style={{ ...label, whiteSpace: "nowrap" }}># {roundRef}</span>
        )}
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "55vw",
          }}
        >
          <span style={{ color: "#99a1af" }}>{tableName}</span>
          {limits && <span style={{ ...value, marginLeft: 6 }}>{limits}</span>}
        </span>
      </div>
    </div>
  );
}
