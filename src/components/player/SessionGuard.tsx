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
  const { roundStatus, lobbyUrl, currentRound } = useGame();
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

  const { warnLevel, expired } = useIdleSession();

  const showWarn = !expired && warnLevel > 0 && roundStatus === "betting_open";

  // Return the player to wherever they launched from. Priority:
  //   1. lobbyUrl — the operator's return URL, passed on launch
  //      (?lobbyUrl=…). For OCMS / Time2bet this is the callback we send them
  //      back to; navigating there hands them to their own lobby.
  //   2. Embedded with no lobbyUrl — post `closeGame` to the operator frame
  //      so their wrapper performs the return (also fires `gameError`
  //      SESSION_EXPIRED so the operator can log it).
  //   3. Neither (direct / QA launch) — reload to re-establish the session
  //      rather than leave a dead button.
  const embedded = typeof window !== "undefined" && window.self !== window.top;
  const returnToSite = () => {
    if (typeof window === "undefined") return;
    if (lobbyUrl) {
      window.location.href = lobbyUrl;
    } else if (embedded) {
      sendToParent("gameError", { code: "SESSION_EXPIRED", reason: "idle" });
      sendToParent("closeGame", { reason: "idle_expired" });
    } else {
      window.location.reload();
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
            // ONE LINE, always. At 460px wide and 13px this wrapped to three
            // lines on a phone and sat as a slab across the middle of the feed.
            // Nearly full width + smaller type + nowrap keeps it to a single
            // strip; ellipsis is the backstop rather than letting it grow again.
            width: "min(96vw, 760px)",
            maxWidth: "96vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "5px 12px",
            borderRadius: 999,
            // Lower opacity: it is a nudge over live video, not a blocker.
            background: warnLevel === 2 ? "rgba(251,44,54,0.72)" : "rgba(240,177,0,0.72)",
            color: warnLevel === 2 ? "#fff" : "#1a1206",
            fontSize: "clamp(10px, 2.6vw, 12px)",
            fontWeight: 700,
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textAlign: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
          role="status"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {warnLevel === 2 ? t("session.warn2") : t("session.warn1")}
          </span>
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
            {/* No "Rejoin" button: a refresh (F5, or pull-to-refresh on mobile)
                already rejoins, and offering a button for it invited players to
                press that instead of the one action we can always honour.
                Back to lobby is the only control here. */}
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
              {t("session.return")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
