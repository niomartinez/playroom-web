"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { useSeatGate } from "@/lib/use-seat-gate";

/**
 * The UNRESOLVED seat state — "we do not know yet whether you may sit here".
 *
 * THIS DOES NOT BLOCK ANYTHING, and that is the whole design. It used to be a
 * `position: fixed; inset: 0` cover at 0.94 opacity with a 22px blur, on the
 * theory that an un-decided money guard must fail closed. That theory predates
 * the server being the authority: `seat_service.evaluate_seat` now refuses the
 * bet at `/internal/bet` and cuts the feed through the stream REVOKE list, off
 * its own answer, whatever this browser believes. So covering the table buys
 * exactly zero enforcement — while costing real money, because the video comes
 * off the streaming VPS and is completely unaffected by a Render blip. A
 * backend hiccup would black out the table for FUNDED players who could still
 * see the deal and still bet. Failing closed here protects nobody and robs the
 * only people it can reach.
 *
 * What is left is honesty: a small status pill that says we are still checking,
 * and after a few seconds offers a retry. The player keeps their video, their
 * round events and their bet controls; if the server does object, it says so
 * itself — through a refused bet and a cut feed — and the moment its answer
 * lands `SeatBalanceGate` (zIndex 190) renders the real modal with the real
 * figure. This one never shows a money figure, because we have not received
 * one and accusing a funded player of being broke is worse than saying nothing.
 *
 * Non-terminal either way: it lifts on the first good answer from any of four
 * sources (SSR bootstrap, client retry, balance WS, table state).
 */

/** How long to look like a normal loader before offering a retry. */
const PATIENCE_MS = 4000;

export default function SeatCheckOverlay() {
  const gate = useSeatGate();
  const t = useT();
  const [slow, setSlow] = useState(false);

  const unresolved = gate.state === "unresolved";

  useEffect(() => {
    if (!unresolved) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), PATIENCE_MS);
    return () => clearTimeout(timer);
  }, [unresolved]);

  if (!unresolved) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        // Below SeatBalanceGate (190) so a decision that resolves to blocked
        // replaces this with no frame showing both.
        zIndex: 189,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "min(92vw, 420px)",
        padding: "8px 14px",
        borderRadius: 999,
        background: "rgba(13,19,32,0.88)",
        border: "1px solid rgba(54,65,83,0.9)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        // The pill must never swallow a tap meant for the table behind it; only
        // the retry button opts back in.
        pointerEvents: "none",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          flexShrink: 0,
          borderRadius: "50%",
          border: "2px solid #364153",
          borderTopColor: "#f0b100",
          animation: "prg-seat-spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes prg-seat-spin { to { transform: rotate(360deg); } }`}</style>
      <span
        style={{
          fontSize: 12,
          lineHeight: 1.35,
          color: "#cbd5e1",
          letterSpacing: 0.2,
        }}
      >
        {slow ? t("seat.checkFailed") : t("seat.checking")}
      </span>
      {slow && (
        <button
          onClick={() => window.location.reload()}
          style={{
            flexShrink: 0,
            padding: "5px 12px",
            borderRadius: 999,
            background: "rgba(43,127,255,0.9)",
            border: "none",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            pointerEvents: "auto",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {t("seat.retry")}
        </button>
      )}
    </div>
  );
}
