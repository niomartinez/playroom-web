"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useGame } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";
import { useT } from "@/lib/i18n";
import { formatMoney } from "@/lib/currency";
import {
  getMuted,
  getVolume,
  setMutedPref,
  setVolumePref,
  subscribeMedia,
  requestVideoReload,
} from "@/lib/media-prefs";

/**
 * #8 / #9 / #11 — the player-facing menu/settings hub, adapted to our UI and
 * mobile-first. A single header button opens a bottom sheet (mobile) /
 * centered card (desktop) with three sections:
 *   - How to Play (#8)
 *   - Payouts & Limits (#11)
 *   - Sound & Video (#9)
 *
 * Self-contained: renders its own trigger button and overlay, so it can be
 * dropped straight into the header's right cluster.
 */

type View = "root" | "howto" | "payouts" | "sound";

/** Standard baccarat payouts (language-neutral ratios). */
const PAYOUTS: { labelKey: string; ratio: string; noteKey?: string }[] = [
  { labelKey: "pay.player", ratio: "1 : 1" },
  { labelKey: "pay.banker", ratio: "0.95 : 1", noteKey: "pay.bankerNote" },
  { labelKey: "pay.tie", ratio: "8 : 1" },
  { labelKey: "pay.playerPair", ratio: "11 : 1" },
  { labelKey: "pay.bankerPair", ratio: "11 : 1" },
  { labelKey: "pay.eitherPair", ratio: "5 : 1" },
  { labelKey: "pay.perfectPair", ratio: "25 : 1" },
];

const rowBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "14px 16px",
  background: "rgba(30,41,57,0.6)",
  border: "1px solid #364153",
  borderRadius: 12,
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const sectionTitle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "#9ca3af",
  margin: "6px 2px 8px",
};

const bodyText: CSSProperties = { fontSize: 13, lineHeight: 1.55, color: "#cbd5e1" };

function ChevronRight() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#6a7282" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default function PlayerMenu() {
  const isMobile = useIsMobile();
  const t = useT();
  const { currency, minBet, maxBet } = useGame();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("root");

  const close = () => {
    setOpen(false);
    setView("root");
  };

  const title =
    view === "howto"
      ? t("menu.howToPlay")
      : view === "payouts"
        ? t("menu.payouts")
        : view === "sound"
          ? t("menu.soundVideo")
          : t("menu.title");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("menu.open")}
        title={t("menu.open")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: isMobile ? 34 : 32,
          height: isMobile ? 34 : 32,
          borderRadius: 8,
          background: "rgba(30,41,57,0.9)",
          border: "1px solid #364153",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            display: "flex",
            alignItems: isMobile ? "flex-end" : "center",
            justifyContent: "center",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={close}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
          />

          {/* Panel */}
          <div
            style={{
              position: "relative",
              width: isMobile ? "100%" : "min(440px, 92vw)",
              maxHeight: isMobile ? "86vh" : "80vh",
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(180deg, #131a2b 0%, #0e1420 100%)",
              border: "1px solid #364153",
              borderRadius: isMobile ? "18px 18px 0 0" : 18,
              boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
              overflow: "hidden",
              paddingBottom: isMobile ? "env(safe-area-inset-bottom, 0px)" : 0,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 12px 12px 14px",
                borderBottom: "1px solid #24314a",
                minHeight: 52,
              }}
            >
              {view !== "root" ? (
                <button
                  onClick={() => setView("root")}
                  aria-label={t("menu.back")}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#9ca3af", fontSize: 14, cursor: "pointer" }}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
                  </svg>
                  {t("menu.back")}
                </button>
              ) : (
                <span style={{ width: 60 }} />
              )}
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{title}</span>
              <button
                onClick={close}
                aria-label={t("menu.close")}
                style={{ width: 60, display: "flex", justifyContent: "flex-end", background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {view === "root" && (
                <>
                  <button style={rowBtn} onClick={() => setView("howto")}>
                    {t("menu.howToPlay")}
                    <ChevronRight />
                  </button>
                  <button style={rowBtn} onClick={() => setView("payouts")}>
                    {t("menu.payouts")}
                    <ChevronRight />
                  </button>
                  <button style={rowBtn} onClick={() => setView("sound")}>
                    {t("menu.soundVideo")}
                    <ChevronRight />
                  </button>
                </>
              )}

              {view === "howto" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={bodyText}>{t("howto.intro")}</p>
                  <div>
                    <div style={sectionTitle}>{t("howto.valuesTitle")}</div>
                    <p style={bodyText}>{t("howto.values")}</p>
                  </div>
                  <div>
                    <div style={sectionTitle}>{t("howto.flowTitle")}</div>
                    <p style={bodyText}>{t("howto.flow")}</p>
                  </div>
                  <div>
                    <div style={sectionTitle}>{t("howto.thirdTitle")}</div>
                    <p style={bodyText}>{t("howto.third")}</p>
                  </div>
                  <div>
                    <div style={sectionTitle}>{t("howto.tipsTitle")}</div>
                    <p style={bodyText}>{t("howto.tips")}</p>
                  </div>
                </div>
              )}

              {view === "payouts" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Limits */}
                  <div>
                    <div style={sectionTitle}>{t("pay.limitsTitle")}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1, background: "rgba(30,41,57,0.6)", border: "1px solid #364153", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{t("pay.min")}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                          {minBet != null ? formatMoney(minBet, currency) : t("pay.unknown")}
                        </div>
                      </div>
                      <div style={{ flex: 1, background: "rgba(30,41,57,0.6)", border: "1px solid #364153", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{t("pay.max")}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                          {maxBet != null ? formatMoney(maxBet, currency) : t("pay.unknown")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payout table */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px 6px" }}>
                      <span style={sectionTitle}>{t("pay.bet")}</span>
                      <span style={sectionTitle}>{t("pay.payout")}</span>
                    </div>
                    <div style={{ border: "1px solid #24314a", borderRadius: 10, overflow: "hidden" }}>
                      {PAYOUTS.map((p, i) => (
                        <div
                          key={p.labelKey}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            background: i % 2 ? "rgba(30,41,57,0.35)" : "transparent",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>{t(p.labelKey)}</span>
                            {p.noteKey && <span style={{ fontSize: 10, color: "#9ca3af" }}>{t(p.noteKey)}</span>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#f0b100", fontVariantNumeric: "tabular-nums" }}>{p.ratio}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p style={{ ...bodyText, fontSize: 11, color: "#6a7282" }}>{t("pay.sideNote")}</p>
                </div>
              )}

              {view === "sound" && <SoundVideoPanel />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** #9 — Sound & Video controls, synced with the in-video controls via media-prefs. */
function SoundVideoPanel() {
  const t = useT();
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);

  // Hydrate from shared prefs on mount, and stay in sync with the in-video
  // control while the panel is open.
  useEffect(() => {
    setMuted(getMuted());
    setVolume(getVolume());
    return subscribeMedia(() => {
      setMuted(getMuted());
      setVolume(getVolume());
    });
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedPref(next);
  };

  const onVolume = (v: number) => {
    setVolume(v);
    setVolumePref(v);
    if (v > 0 && muted) {
      setMuted(false);
      setMutedPref(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={sectionTitle}>{t("sv.soundTitle")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={toggleMute}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              background: muted ? "rgba(30,41,57,0.6)" : "rgba(43,127,255,0.18)",
              border: `1px solid ${muted ? "#364153" : "rgba(43,127,255,0.5)"}`,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {muted ? (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z M23 9l-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
              </svg>
            )}
            {muted ? t("sv.unmute") : t("sv.mute")}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            aria-label={t("sv.volume")}
            style={{ flex: 1, accentColor: "#2b7fff", cursor: "pointer" }}
          />
        </div>
      </div>

      <div>
        <div style={sectionTitle}>{t("sv.videoTitle")}</div>
        <button
          onClick={() => requestVideoReload()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(30,41,57,0.6)",
            border: "1px solid #364153",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 00-14.9-3M4 15a8 8 0 0014.9 3" />
          </svg>
          {t("sv.reload")}
        </button>
        <p style={{ ...bodyText, fontSize: 11, color: "#6a7282", marginTop: 6 }}>{t("sv.reloadHint")}</p>
      </div>
    </div>
  );
}
