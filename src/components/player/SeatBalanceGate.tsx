"use client";

import { useGame } from "@/lib/game-context";
import { useT } from "@/lib/i18n";
import { resolveMinSeatBalance } from "@/lib/min-seat-balance";
import { sendToParent } from "@/lib/iframe-bridge";

/**
 * Minimum seat-balance gate.
 *
 * A funded seat carries an ongoing floor: if the player's wallet drops below
 * the server-configured `block` threshold, the seat is at risk and this
 * full-cover overlay takes over until they top up (or leave). Unlike the
 * idle "Session Expired" overlay this is REACTIVE, not terminal — it lifts on
 * its own the moment a deposit raises the balance back to/above `block`.
 *
 * Modelled on SessionGuard's expired block (fixed full-cover alertdialog) with
 * the cashier handling from LowBalanceGate. Sits at zIndex 190 — above
 * LowBalanceGate (17) so the seat floor wins when both would apply, but BELOW
 * SessionGuard's terminal expired overlay (200) so the non-recoverable
 * session-end dialog wins if a player is both idle-expired and below the floor.
 */
export default function SeatBalanceGate() {
  const {
    token,
    balance,
    balanceLoaded,
    currency,
    minSeatBalance,
    placedBets,
    lobbyUrl,
    cashierUrl,
  } = useGame();
  const t = useT();

  // Effective thresholds — server value, with the off-prod QA URL override.
  const { block } = resolveMinSeatBalance(minSeatBalance);

  // Money already on the table buys the seat: a player who went all-in this
  // round is BELOW the floor immediately, but that stake is riding on the hand
  // being dealt — if they win, settlement lifts them back above it. Dropping
  // the shutter mid-round would trap them exactly when they might recover.
  // Mirror the server-side exemptions (seat-floor bet gate + video-cut both
  // skip a player with a live ACCEPTED stake) so the client overlay agrees:
  // exempt while a bet is live/settling, re-evaluate once it clears (a loss
  // clears placedBets via the settlement fly-back → the gate then applies next
  // round; a win credits the balance back above the floor first).
  const hasLiveStake = placedBets.length > 0;

  const gated =
    token !== "demo" &&
    balanceLoaded && // never flash before the first real balance frame
    minSeatBalance != null &&
    balance < block &&
    !hasLiveStake;

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

  // ADD FUNDS reachability mirrors LowBalanceGate: a launch cashierUrl, or an
  // operator iframe that can open its own cashier via postMessage.
  const canAddFunds = Boolean(cashierUrl) || embedded;
  const addFunds = () => {
    if (cashierUrl && typeof window !== "undefined") {
      window.location.href = cashierUrl;
    } else if (embedded) {
      sendToParent("openCashier", { reason: "below_min_seat_balance" });
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
        background: "rgba(3,7,18,0.82)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
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
          {t("seat.blockTitle")}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "#cbd5e1", marginBottom: 22 }}>
          {t("seat.blockBody")}
        </p>
        {canAddFunds && (
          <button
            onClick={addFunds}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              background: "#f0b100",
              border: "none",
              color: "#0b0b0b",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              marginBottom: 10,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {t("seat.addFunds")}
          </button>
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
