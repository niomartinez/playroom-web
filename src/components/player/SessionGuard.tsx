"use client";

import { useGame } from "@/lib/game-context";
import { useT } from "@/lib/i18n";
import { useIdleSession } from "@/lib/use-idle-kick";
import { sendToParent } from "@/lib/iframe-bridge";

/**
 * #5 — Idle-session UI. Renders escalating "place a bet" warnings while a
 * betting window is open, and a frozen "Session Expired" overlay once the
 * player has been removed for inactivity.
 *
 * The overlay freezes the game (covers + captures all input, dims the
 * background) but never redirects or closes the tab — the player returns
 * manually. Fixed-position, so it can be rendered as a sibling of the layout.
 */
export default function SessionGuard() {
  const { roundStatus, lobbyUrl } = useGame();
  const t = useT();
  const { warnLevel, expired } = useIdleSession();

  const showWarn = !expired && warnLevel > 0 && roundStatus === "betting_open";

  const returnToSite = () => {
    if (lobbyUrl && typeof window !== "undefined") {
      window.location.href = lobbyUrl;
    } else {
      sendToParent("closeGame", { reason: "idle_expired" });
    }
  };

  return (
    <>
      {showWarn && (
        <div
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 56px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 110,
            maxWidth: "min(92vw, 460px)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderRadius: 12,
            background: warnLevel === 2 ? "rgba(251,44,54,0.92)" : "rgba(240,177,0,0.94)",
            color: warnLevel === 2 ? "#fff" : "#1a1206",
            fontSize: 13,
            fontWeight: 700,
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            backdropFilter: "blur(2px)",
          }}
          role="status"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>{warnLevel === 2 ? t("session.warn2") : t("session.warn1")}</span>
        </div>
      )}

      {expired && (
        <div
          role="alertdialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
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
                background: "rgba(251,44,54,0.14)",
                border: "1px solid rgba(251,44,54,0.4)",
              }}
            >
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fb2c36" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 7v5l3 2" />
              </svg>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: 0.4, marginBottom: 10 }}>
              {t("session.expiredTitle")}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#cbd5e1", marginBottom: 22 }}>
              {t("session.expiredBody")}
            </p>
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
              {t("session.return")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
