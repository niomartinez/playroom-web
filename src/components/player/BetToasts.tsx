"use client";

import { useToast } from "@/lib/toast-context";

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
  const { toasts, dismiss } = useToast();
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
