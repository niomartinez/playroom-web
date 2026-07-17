"use client";

import { useGame } from "@/lib/game-context";
import { useT } from "@/lib/i18n";
import { formatMoney } from "@/lib/currency";
import { sendToParent } from "@/lib/iframe-bridge";

/**
 * #4 — Low-balance feed gate.
 *
 * A player who can't meet the table minimum doesn't get to watch the dealer.
 * The live feed is the product; leaving it running for someone who can't bet
 * gives it away. So this blurs and darkens the feed and lays a placard across
 * the middle — where the dealer stands — until they can play again.
 *
 * It replaces the old dismissible "Low Balance" modal, which could be closed to
 * reveal the feed underneath. That made it a notice; this is a gate. There is
 * deliberately no dismiss.
 *
 * The design is the table's own limit placard: the physical sign that decides
 * who may sit. It states the two numbers that matter — the minimum, and how far
 * short you are — and nothing else. Hard-edged and full-bleed, unlike every
 * rounded panel in the app, so it reads as an object in the scene rather than
 * UI floating over it.
 *
 * Anchored inside the feed container (a sibling of RoundCountdown), so it can
 * only ever cover the video — never the bet pads below it.
 */
export default function LowBalanceGate() {
  const { balance, balanceLoaded, minBet, currency, token, placedBets, cashierUrl } = useGame();
  const t = useT();

  const hasStake = placedBets.length > 0;
  const short = minBet != null ? minBet - balance : 0;

  const gated =
    token !== "demo" &&
    balanceLoaded && // 0 until the wallet reports; don't accuse a funded player
    minBet != null &&
    minBet > 0 &&
    balance < minBet &&
    // Money already on the table buys the view: never drop the shutter on a
    // player mid-round who has a stake riding on the hand being dealt.
    !hasStake;

  if (!gated) return null;

  // Whether ADD FUNDS can actually do anything:
  //   - a launch cashierUrl → navigate there;
  //   - embedded in an operator iframe → postMessage, the parent opens its
  //     cashier (sendToParent is a NO-OP when we're the top window, which is
  //     exactly the QA / direct-launch case that made the button look dead).
  // With neither we must not render a bright CTA that goes nowhere; show the
  // instruction instead so the placard is still honest.
  const embedded =
    typeof window !== "undefined" && window.self !== window.top;
  const canAddFunds = Boolean(cashierUrl) || embedded;

  const addFunds = () => {
    if (cashierUrl && typeof window !== "undefined") {
      window.location.href = cashierUrl;
    } else if (embedded) {
      sendToParent("openCashier", { reason: "below_table_minimum" });
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        // Above the countdown (15) and winners marquee (16) — both moot when
        // you can't bet — but below the chat panel (20), which stays usable.
        zIndex: 17,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Cover. The scrim carries the weight on its own: if backdrop-filter
          is unavailable the dealer must still not be visible, so this is not
          allowed to depend on the blur landing. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(3,5,9,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      />

      {/* The placard */}
      <div
        style={{
          position: "relative",
          width: "100%",
          background: "linear-gradient(180deg, #080b12 0%, #05070c 100%)",
          borderTop: "1px solid rgba(240,177,0,0.55)",
          borderBottom: "1px solid rgba(240,177,0,0.55)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
          padding: "clamp(12px, 3.2vh, 20px) clamp(16px, 5vw, 32px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(16px, 6vw, 48px)",
          flexWrap: "wrap",
          animation: "prg-placard-in 220ms ease-out both",
        }}
      >
        <style>{`
          @keyframes prg-placard-in {
            from { opacity: 0; transform: scaleY(0.82); }
            to   { opacity: 1; transform: scaleY(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-prg-placard] { animation: none !important; }
          }
        `}</style>

        <Stat label={t("gate.minimum")} value={formatMoney(minBet!, currency)} />
        <Stat label={t("gate.short")} value={formatMoney(short, currency)} accent />

        {canAddFunds ? (
          <button
            onClick={addFunds}
            style={{
              flexShrink: 0,
              minHeight: 44, // iOS touch target
              padding: "0 clamp(20px, 6vw, 34px)",
              border: "none",
              borderRadius: 8,
              background: "#f0b100",
              color: "#0b0b0b",
              fontSize: "clamp(14px, 1.6vh, 15px)",
              fontWeight: 800,
              letterSpacing: "0.01em",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {t("gate.addFunds")}
          </button>
        ) : (
          // No cashier reachable (direct/QA launch). A dead yellow button
          // reads as broken; a plain instruction reads as intended.
          <div
            data-prg-placard
            style={{
              flexShrink: 0,
              fontSize: "clamp(12px, 1.5vh, 14px)",
              fontWeight: 600,
              color: "#9aa4b2",
              maxWidth: 220,
            }}
          >
            {t("gate.addFundsHint")}
          </div>
        )}
      </div>
    </div>
  );
}

/** One reading on the placard: a quiet label over a loud number. */
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div data-prg-placard style={{ textAlign: "left" }}>
      <div
        style={{
          fontSize: "clamp(9px, 1.2vh, 11px)",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#6a7282",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "clamp(20px, 3.4vh, 30px)",
          fontWeight: 800,
          lineHeight: 1.05,
          fontVariantNumeric: "tabular-nums",
          color: accent ? "#f0b100" : "#e5e7eb",
        }}
      >
        {value}
      </div>
    </div>
  );
}
