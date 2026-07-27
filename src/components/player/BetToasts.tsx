"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/lib/toast-context";
import { useGame } from "@/lib/game-context";
import { useT } from "@/lib/i18n";
import { formatMoney } from "@/lib/currency";

/**
 * Transient notices for the player — currently the only thing that speaks
 * when a bet action is refused.
 *
 * Before this, every rejection was silent: `MainBets` called
 * `void moveMainBet(...)` and dropped the result on the floor, and
 * `useBetting` had no surface to report to at all. A drag that the server
 * refused (over the table max once the pad's chips consolidate into one bet,
 * betting closed, an opposing leg, the source bet not committed yet) just
 * snapped the chips back with no explanation — indistinguishable from a
 * missed gesture.
 *
 * Anchored bottom-centre above the bet panel rather than over the feed: the
 * feed already carries the countdown ring, the winners marquee and the
 * low-balance gate, and this needs to read next to the pads the player is
 * actually touching.
 */
export default function BetToasts() {
  const { toasts, toast, dismiss } = useToast();
  const { betRefundNotice, setBetRefundNotice, currency } = useGame();
  const t = useT();

  /* The server swept this hand at betting close for missing the table
   * minimum. `useBalanceWs` has already emptied the pad; this is the half
   * that says WHY, so a player whose chips vanish mid-round isn't left
   * guessing whether the bet was taken. It cannot toast from the WS hook
   * itself — that hook runs outside the ToastProvider tree.
   *
   * Keyed on fightId so a re-render can't re-toast the same sweep, and a
   * second sweep in a later round still speaks. */
  const lastRefundRef = useRef<string | null>(null);
  useEffect(() => {
    if (!betRefundNotice) return;
    const key = betRefundNotice.fightId || "unknown";
    if (lastRefundRef.current !== key) {
      lastRefundRef.current = key;
      toast({
        type: "error",
        message: t("bet.underMinRefunded", {
          minimum: formatMoney(betRefundNotice.minimum, currency),
        }),
        duration: 6000,
      });
    }
    setBetRefundNotice(null);
  }, [betRefundNotice, setBetRefundNotice, toast, t, currency]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        pointerEvents: "none",
        width: "min(92vw, 420px)",
      }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            pointerEvents: "auto",
            width: "100%",
            textAlign: "center",
            padding: "10px 16px",
            borderRadius: 12,
            border: `1px solid ${t.type === "error" ? "rgba(251,44,54,0.5)" : "rgba(240,177,0,0.4)"}`,
            background:
              t.type === "error" ? "rgba(40,8,10,0.94)" : "rgba(20,16,4,0.94)",
            color: t.type === "error" ? "#ff8a90" : "#f0b100",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.35,
            boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
