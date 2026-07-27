"use client";

import { useGame } from "@/lib/game-context";
import { sendToParent } from "@/lib/iframe-bridge";
import { isEmbedded, returnToLobby } from "@/lib/return-to-lobby";
import { useIsMobile } from "@/lib/use-mobile";
import { useCountdown } from "@/lib/use-countdown";
import { useT, normalizeLang } from "@/lib/i18n";
import PlayerMenu from "./PlayerMenu";

/**
 * Compact language switcher (English / 中文). A native <select> keeps it
 * accessible and keyboard-friendly. Writes through setLang, which persists
 * the choice (localStorage) so it wins over the launch ?lang= on reload.
 */
function LanguageSelect({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useGame();
  const t = useT();
  const current = normalizeLang(lang);
  return (
    <select
      aria-label={t("header.language")}
      value={current}
      onChange={(e) => setLang(e.target.value)}
      style={{
        background: "rgba(30,41,57,0.9)",
        color: "#fff",
        border: "1px solid #364153",
        borderRadius: 8,
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        padding: compact ? "3px 6px" : "4px 8px",
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
      }}
    >
      <option value="en">English</option>
      <option value="zh-Hans">中文</option>
    </select>
  );
}

export default function PlayerHeader() {
  const { roundStatus, lobbyUrl, tableName, dealerName } = useGame();
  const isMobile = useIsMobile();
  const t = useT();
  // Shared betting countdown — same source as the big feed overlay so the
  // header pill and the on-video number never disagree.
  const countdown = useCountdown();

  const statusLabel: Record<string, string> = {
    waiting: t("status.waiting"),
    // `countdown > 0`, not just non-null: betting stays open for a grace
    // window past zero (BETTING_CLOSE_GRACE_SECONDS) so a late gesture the
    // player made while the timer was still up is still honoured. During it
    // the honest label is "PLACE BETS" — betting really is open — rather than
    // a "(0s)" that reads as a stuck clock.
    betting_open:
      countdown !== null && countdown > 0
        ? t("status.placeBetsCountdown", { seconds: countdown })
        : t("status.placeBets"),
    dealing: t("status.dealing"),
    result: t("status.result"),
  };

  // Same exit as the blocking modals — see lib/return-to-lobby. `closeGame`
  // only when we can't work out where the player came from; on its own it shuts
  // the tab, which is not a "back".
  const handleBack = () => {
    if (returnToLobby(lobbyUrl)) return;
    if (isEmbedded()) sendToParent("closeGame");
  };

  if (isMobile) {
    return (
      <header
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 48,
          padding: "0 14px",
          background: "rgba(16, 24, 40, 0.95)",
          borderBottom: "1px solid #364153",
        }}
      >
        {/* Left: Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexShrink: 1 }}>
          <button onClick={handleBack} style={{ flexShrink: 0, cursor: "pointer", background: "none", border: "none", padding: 0 }}>
            <img src="/logo.png" alt="Playroom Gaming" style={{ height: 22, objectFit: "contain" }} />
          </button>
          {dealerName && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#99A1AF",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {t("header.dealer", { name: dealerName })}
            </span>
          )}
        </div>

        {/* Centre slot removed: a flex:1 spacer between the logo and the
            controls pushed the dealer name to the middle of the bar, which read
            as arbitrary. It now sits directly beside the logo, where it belongs
            as a caption to the table. */}
        <div style={{ flex: 1, minWidth: 0 }} />

        {/* Right: menu + language switcher. Round number moved to TableInfoBar. */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <PlayerMenu />
          <LanguageSelect compact />
        </div>
      </header>
    );
  }

  return (
    <header
      className="flex items-center justify-between px-[1.5vw] border-b border-[#364153] min-h-0 h-full"
      style={{
        background: "linear-gradient(to right, #101828, #1e2939)",
        boxShadow: "0px 25px 50px rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center gap-[0.8vw]">
        <button onClick={handleBack} className="cursor-pointer">
          <img src="/logo.png" alt="Playroom Gaming" className="object-contain h-[3.5vh]" />
        </button>
        <span className="text-[1.1vh] text-white font-semibold">{tableName}</span>
        <span className="text-[1vh] text-[#6a7282]">•</span>
        <span className="text-[1.1vh] text-[#99a1af]">
          {dealerName ? t("header.dealer", { name: dealerName }) : ""}
        </span>
      </div>
      <div className="flex items-center gap-[0.6vw]">
        {/* Round status pill */}
        <div
          className="flex items-center gap-[0.4vw] border rounded-[0.6vw] px-[0.8vw] py-[0.4vh]"
          style={{
            backgroundColor: roundStatus === "betting_open" ? "rgba(5,223,114,0.15)" : "#1e2939",
            borderColor: roundStatus === "betting_open" ? "#05df72" : "#364153",
          }}
        >
          <span
            className="font-semibold"
            style={{
              fontSize: "1.2vh",
              color: roundStatus === "betting_open" ? "#05df72" : "white",
            }}
          >
            {statusLabel[roundStatus] || t("status.live")}
          </span>
        </div>
        {/* Language switcher */}
        <LanguageSelect />
        {/* Round number moved to TableInfoBar (bottom-right), Evolution-style. */}
        <PlayerMenu />
      </div>
    </header>
  );
}
