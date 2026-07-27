"use client";

import { useGame } from "@/lib/game-context";
import { useT } from "@/lib/i18n";
import { useSeatGate } from "@/lib/use-seat-gate";
import { sendToParent } from "@/lib/iframe-bridge";
import { formatMoney } from "@/lib/currency";

/**
 * Minimum seat-balance gate.
 *
 * A funded seat carries an ongoing floor: if the player's wallet drops below
 * the server-configured floor, the seat is at risk and this full-cover overlay
 * takes over until they top up (or leave). Unlike the idle "Session Expired"
 * overlay this is REACTIVE, not terminal — it lifts on its own the moment a
 * deposit raises the balance back over the floor.
 *
 * The DECISION is not made here any more — see `use-seat-gate.ts` and
 * `seat-status.ts`. This component is a pure renderer over it, because the
 * decision has four consumers that must all agree, and because computing it
 * locally from two racing browser transports is what let a below-floor player
 * in with no dialog at all.
 *
 * zIndex 190 — above LowBalanceGate (17) so the seat floor wins when both would
 * apply, and above SeatCheckOverlay (189) so a decision that resolves to
 * blocked replaces the "checking" panel with no frame showing both.
 *
 * Its old relationship with SessionGuard's expired overlay (200) is GONE: that
 * dialog is now suppressed outright while seat-gated, rather than stacking over
 * this one. While a player is below the seat floor, the min-balance modal is
 * the only thing they should ever see — being told they were removed for
 * inactivity, when the server is refusing their bets over money, named the
 * wrong reason and hid the right one.
 */
export default function SeatBalanceGate() {
  const { currency, lobbyUrl, currentRound } = useGame();
  const t = useT();

  // Short round reference for the dialog below — players screenshot these when
  // they think a kick was wrong, and without it the screenshot says nothing
  // about WHICH round it happened in.
  const roundRef = (() => {
    const raw = currentRound?.roundNumber ?? currentRound?.roundId;
    if (raw == null) return null;
    const v = String(raw);
    return v.startsWith("ROUND-") ? v.slice(6) : v;
  })();

  // The decision, and the figure to quote with it. `required` is the APPLICABLE
  // floor (keep once you have played here, enter before that) — quoting `block`
  // while actually refusing entry at `enter` is what made this dialog say
  // "minimum balance 100" to a player blocked by a 500 entry bar.
  const { state, required, seated } = useSeatGate();
  const gated = state === "blocked";

  // Return the player to wherever they launched from — same priority ladder as
  // SessionGuard.returnToSite(): lobbyUrl → href; embedded → closeGame; else
  // reload rather than leave a dead button.
  const embedded =
    typeof window !== "undefined" && window.self !== window.top;
  const returnToSite = () => {
    if (typeof window === "undefined") return;
    if (lobbyUrl) {
      window.location.href = lobbyUrl;
    } else if (embedded) {
      sendToParent("closeGame", { reason: "min_seat_balance" });
    } else {
      window.location.reload();
    }
  };

  if (!gated) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 190,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        // The live studio feed sits behind this overlay. A player who can no
        // longer fund a seat should not keep watching the table, so the cover is
        // near-opaque AND heavily blurred — enough that the stream reads as
        // obscured rather than merely dimmed.
        background: "rgba(3,7,18,0.94)",
        backdropFilter: "blur(22px) saturate(0.6)",
        WebkitBackdropFilter: "blur(22px) saturate(0.6)",
      }}
    >
      <div
        style={{
          width: "min(400px, 92vw)",
          textAlign: "center",
          background: "linear-gradient(180deg, #131a2b 0%, #0e1420 100%)",
          border: "1px solid #364153",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
          padding: "30px 24px",
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            margin: "0 auto 16px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(240,177,0,0.14)",
            border: "1px solid rgba(240,177,0,0.4)",
          }}
        >
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#f0b100" strokeWidth={2}>
            <rect x="2" y="6" width="20" height="13" rx="2" />
            <path strokeLinecap="round" d="M2 10h20M6 15h4" />
          </svg>
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: 0.4, marginBottom: 10 }}>
          {seated ? t("seat.blockTitle") : t("seat.enterTitle")}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "#cbd5e1", marginBottom: 18 }}>
          {seated ? t("seat.blockBody") : t("seat.enterBody")}
        </p>
        {/* The actual figure, stated plainly. The old copy only said "below the
            minimum required" and left the player guessing what to top up to.
            Driven by the server threshold, so retuning min_seat_balance in
            /admin changes this number with no client release. */}
        <div
          style={{
            marginBottom: 22,
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(240,177,0,0.08)",
            border: "1px solid rgba(240,177,0,0.28)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "#99a1af",
              marginBottom: 4,
            }}
          >
            {seated ? t("seat.requiredKeepLabel") : t("seat.requiredEnterLabel")}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f0b100", lineHeight: 1.1 }}>
            {formatMoney(required, currency)}
          </div>
        </div>
        {/* No "Add funds" here by design: we serve multiple operators and have no
            universal cashier to send a player to — each operator funds its own
            players on its own site. "Back to lobby" is the only action we can
            honour for everyone. */}
        {/* Round reference, small: players screenshot this dialog when they
            think a kick was wrong, and without it the screenshot says nothing
            about WHICH round it happened in. */}
        {roundRef && (
          <div
            style={{
              marginTop: 14,
              fontSize: 10,
              letterSpacing: 0.4,
              color: "#4a5565",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            # {roundRef}
          </div>
        )}
        <button
          onClick={returnToSite}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            background: "rgba(43,127,255,0.9)",
            border: "none",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {t("seat.return")}
        </button>
      </div>
    </div>
  );
}
