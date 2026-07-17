"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/game-context";
import { useT } from "@/lib/i18n";
import { formatMoney } from "@/lib/currency";

/**
 * #4 — Low-balance notice. When a betting window opens and the player's
 * balance can't cover the table minimum bet, show a dismissible modal
 * prompting a deposit (adapted from the EVO "Low Balance" prompt). Shown at
 * most once per round; clears itself once the balance recovers.
 *
 * Demo mode is exempt (no real wallet). Dormant until the table's min bet is
 * known (plumbed from table state), so it never false-fires.
 */
export default function LowBalanceModal() {
  const { balance, balanceLoaded, minBet, currency, roundStatus, currentRound, token } = useGame();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [dismissedRound, setDismissedRound] = useState<string | null>(null);

  const roundKey = currentRound?.roundId != null ? String(currentRound.roundId) : null;

  useEffect(() => {
    if (token === "demo") return;
    if (minBet == null || minBet <= 0) return;
    // `balance` is 0 until the balance socket reports in, and that socket can
    // lose the race against min-bet recovery + the lobby's betting_open.
    // Without this gate a fully-funded player gets told they're short on load.
    if (!balanceLoaded) return;
    if (roundStatus !== "betting_open") return;
    // Recovered (deposit, settlement credit) — honour the contract above and
    // stand down instead of leaving a stale warning on screen.
    if (balance >= minBet) {
      setOpen(false);
      return;
    }
    if (roundKey && dismissedRound === roundKey) return;
    setOpen(true);
  }, [roundStatus, roundKey, balance, balanceLoaded, minBet, token, dismissedRound]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    if (roundKey) setDismissedRound(roundKey);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 130,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }} />
      <div
        style={{
          position: "relative",
          width: "min(360px, 92vw)",
          background: "linear-gradient(180deg, #131a2b 0%, #0e1420 100%)",
          border: "1px solid #364153",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          padding: "24px 22px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 14px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(240,177,0,0.14)",
            border: "1px solid rgba(240,177,0,0.4)",
          }}
        >
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#f0b100" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{t("low.title")}</div>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: "#cbd5e1", marginBottom: 20 }}>
          {t("low.body", { min: minBet != null ? formatMoney(minBet, currency) : "" })}
        </p>
        <button
          onClick={close}
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
          {t("low.close")}
        </button>
      </div>
    </div>
  );
}
