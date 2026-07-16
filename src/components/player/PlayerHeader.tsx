"use client";

import { useGame } from "@/lib/game-context";
import { sendToParent } from "@/lib/iframe-bridge";
import { useIsMobile } from "@/lib/use-mobile";
import { useCountdown } from "@/lib/use-countdown";
import { useT, normalizeLang } from "@/lib/i18n";

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
  const { currentRound, roundStatus, lobbyUrl, tableName, dealerName } = useGame();
  const isMobile = useIsMobile();
  const t = useT();
  // Shared betting countdown — same source as the big feed overlay so the
  // header pill and the on-video number never disagree.
  const countdown = useCountdown();

  const roundLabel = (() => {
    if (!currentRound?.roundNumber) return t("header.noRound");
    const rn = String(currentRound.roundNumber);
    // Clean up internal IDs like "ROUND-EA6EC7C8" → just show short hash
    if (rn.startsWith("ROUND-")) return t("header.round", { n: rn.slice(6, 10) });
    return t("header.round", { n: rn });
  })();

  const statusColor: Record<string, string> = {
    waiting: "#6a7282",
    betting_open: "#05df72",
    dealing: "#f0b100",
    result: "#fb2c36",
  };

  const statusLabel: Record<string, string> = {
    waiting: t("status.waiting"),
    betting_open: countdown !== null ? t("status.placeBetsCountdown", { seconds: countdown }) : t("status.placeBets"),
    dealing: t("status.dealing"),
    result: t("status.result"),
  };

  const handleBack = () => {
    if (lobbyUrl) {
      window.location.href = lobbyUrl;
    } else {
      sendToParent("closeGame");
    }
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
        <button onClick={handleBack} style={{ cursor: "pointer", background: "none", border: "none", padding: 0, zIndex: 1 }}>
          <img src="/logo.png" alt="Play Room Gaming" style={{ height: 22, objectFit: "contain" }} />
        </button>

        {/* Center: LIVE badge + Table label — absolutely centered, single row */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "rgba(251, 44, 54, 0.15)",
              border: "1px solid rgba(251, 44, 54, 0.4)",
              borderRadius: 999,
              padding: "2px 8px",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#FB2C36",
                animation: "live-pulse 2.4s ease-in-out infinite",
                boxShadow: "0 0 6px rgba(251,44,54,0.4)",
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#ffffff", letterSpacing: 0.4 }}>{t("status.live")}</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#99A1AF" }}>{t("header.liveBaccarat")}</span>
        </div>

        {/* Right: language switcher + round number */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, zIndex: 1 }}>
          <LanguageSelect compact />
          <span style={{ fontSize: 11, fontWeight: 500, color: "#ffffff" }}>{roundLabel}</span>
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
          <img src="/logo.png" alt="Play Room Gaming" className="object-contain h-[3.5vh]" />
        </button>
        <span className="text-[1.1vh] text-[#99a1af]">{t("header.liveBaccarat")}</span>
        <span className="text-[1vh] text-[#6a7282]">|</span>
        <span className="text-[1.1vh] text-white font-semibold">{tableName}</span>
        <span className="text-[1vh] text-[#6a7282]">•</span>
        <span className="text-[1.1vh] text-[#99a1af]">{dealerName}</span>
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
            className="rounded-full"
            style={{
              width: "0.8vh",
              height: "0.8vh",
              /* Always red with a calm slow pulse to show the stream is live,
                 independent of round phase. */
              backgroundColor: roundStatus === "betting_open" ? statusColor.betting_open : "#fb2c36",
              animation: "live-pulse 2.4s ease-in-out infinite",
              boxShadow: "0 0 6px rgba(251,44,54,0.4)",
            }}
          />
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
        {/* Round number */}
        <div className="flex items-center gap-[0.4vw] bg-[#1e2939] border border-[#364153] rounded-[0.6vw] px-[0.8vw] py-[0.4vh]">
          <svg className="text-[#99a1af]" style={{ width: "1.2vh", height: "1.2vh" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="font-semibold text-white" style={{ fontSize: "1.2vh" }}>{roundLabel}</span>
        </div>
      </div>
    </header>
  );
}
