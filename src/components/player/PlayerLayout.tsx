"use client";

import { useState } from "react";
import { useIsMobile } from "@/lib/use-mobile";
import { useFeatures } from "@/lib/use-features";
import { useGame } from "@/lib/game-context";
import PlayerHeader from "./PlayerHeader";
import ChipSelector from "./ChipSelector";
import LiveChat from "./LiveChat";
import SideBets from "./SideBets";
import MainBets from "./MainBets";
import BaccaratTable from "./BaccaratTable";
import BalanceBar from "./BalanceBar";
import RoadmapPanel from "./RoadmapPanel";
import DealVisualizer from "./DealVisualizer";
import MobileActionBar from "./MobileActionBar";
import MobileTipPanel from "./MobileTipPanel";
import FlyingChips from "./FlyingChips";
import WinFlash from "./WinFlash";

/**
 * Inline keyframes for the betting-open pulse on the bet panel border.
 * Tone matches the Tie color (#00bc7d) so it's instantly recognizable.
 */
const BET_PANEL_STYLES = `
@keyframes prgBetPanelPulse {
  0% {
    box-shadow: 0 0 0 1px rgba(0, 188, 125, 0.55), 0 0 14px rgba(0, 188, 125, 0.35);
    border-color: rgba(0, 188, 125, 0.55);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(0, 188, 125, 0.95), 0 0 28px rgba(0, 188, 125, 0.75);
    border-color: rgba(0, 188, 125, 0.95);
  }
  100% {
    box-shadow: 0 0 0 1px rgba(0, 188, 125, 0.55), 0 0 14px rgba(0, 188, 125, 0.35);
    border-color: rgba(0, 188, 125, 0.55);
  }
}
.prg-bet-panel--open {
  animation: prgBetPanelPulse 2s ease-in-out infinite;
}
.prg-bet-panel--closed {
  border-color: rgba(54, 65, 83, 0.6) !important;
  box-shadow: none;
  animation: none;
}
`;

export default function PlayerLayout() {
  const isMobile = useIsMobile();
  const { live_chat_enabled } = useFeatures();
  const { roundStatus, placedBets, clearPlacedBets } = useGame();
  const [showTips, setShowTips] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const isBettingOpen = roundStatus === "betting_open";
  const hasPlacedBets = placedBets.length > 0;
  const panelClass = isBettingOpen ? "prg-bet-panel--open" : "prg-bet-panel--closed";

  if (isMobile) {
    return (
      <div
        className="player-layout"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          background:
            "linear-gradient(107.15deg, #030712 0%, #101828 50%, #000000 100%)",
          position: "relative",
        }}
      >
        <style>{BET_PANEL_STYLES}</style>

        {/* Header — sticky */}
        <div style={{ position: "sticky", top: 0, zIndex: 50 }}>
          <PlayerHeader />
        </div>

        {/* Video / Deal area — 16:9 */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#000",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <DealVisualizer />
        </div>

        {/* Action Bar — Tip + Live Chat */}
        <MobileActionBar
          onTipPress={() => { setShowTips((v) => !v); setShowChat(false); }}
          onChatPress={live_chat_enabled ? () => { setShowChat((v) => !v); setShowTips(false); } : undefined}
          chatEnabled={live_chat_enabled}
        />

        {/* Tip panel overlay */}
        {showTips && (
          <MobileTipPanel onClose={() => setShowTips(false)} />
        )}

        {/* Live Chat overlay — gated by feature flag */}
        {live_chat_enabled && showChat && (
          <div style={{ padding: "0 19px" }}>
            <LiveChat mobile />
          </div>
        )}

        {/* Bet panel — wraps Balance + Side Bets + Main Bets so the pulse outlines the whole area */}
        <div
          className={panelClass}
          style={{
            margin: "16px 19px 24px 19px",
            padding: 12,
            borderRadius: 16,
            border: "1.5px solid rgba(54, 65, 83, 0.6)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          <BalanceBar />

          {/* Clear bets — only when betting is open */}
          {isBettingOpen && (
            <button
              onClick={clearPlacedBets}
              disabled={!hasPlacedBets}
              style={{
                alignSelf: "flex-end",
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(208,135,0,0.3)",
                color: hasPlacedBets ? "#f0b100" : "rgba(240,177,0,0.4)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.6,
                cursor: hasPlacedBets ? "pointer" : "not-allowed",
                opacity: hasPlacedBets ? 1 : 0.55,
                transition: "opacity 0.15s ease, color 0.15s ease",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              CLEAR BETS
            </button>
          )}

          <SideBets />
          <MainBets />
        </div>

        {/* Roadmap */}
        <div style={{ padding: "0 19px" }}>
          <RoadmapPanel />
        </div>

        {/* Score Cards */}
        <div style={{ padding: "0 19px", marginTop: 16, marginBottom: 24 }}>
          <BaccaratTable />
        </div>

        <FlyingChips />
        <WinFlash />
      </div>
    );
  }

  // Desktop layout
  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        display: "grid",
        gridTemplateRows: "5.5vh 1fr 30vh",
        background: "#0a0f1a",
      }}
    >
      <style>{BET_PANEL_STYLES}</style>

      <PlayerHeader />

      <div className="relative min-h-0 overflow-hidden bg-black flex items-center justify-center">
        <DealVisualizer />
        <ChipSelector />
        {live_chat_enabled && <LiveChat />}
      </div>

      <div
        className="min-h-0 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: "22% 44% 32%",
          gap: "0.5vw",
          padding: "0.4vh 16px",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <RoadmapPanel />
        </div>
        <div
          className={`min-h-0 overflow-hidden ${panelClass}`}
          style={{
            display: "grid",
            gridTemplateRows: "25% 28% 1fr",
            gap: "0.4vh",
            padding: "0.4vh 0.5vw",
            borderRadius: "0.7vw",
            border: "1.5px solid rgba(54, 65, 83, 0.6)",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            position: "relative",
          }}
        >
          {/* Clear bets — overlay top-right when betting is open */}
          {isBettingOpen && (
            <button
              onClick={clearPlacedBets}
              disabled={!hasPlacedBets}
              style={{
                position: "absolute",
                top: "0.4vh",
                right: "0.5vw",
                zIndex: 5,
                padding: "0.4vh 0.7vw",
                borderRadius: "0.4vw",
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(208,135,0,0.3)",
                color: hasPlacedBets ? "#f0b100" : "rgba(240,177,0,0.4)",
                fontSize: "clamp(9px, 1vh, 13px)",
                fontWeight: 700,
                letterSpacing: 0.5,
                cursor: hasPlacedBets ? "pointer" : "not-allowed",
                opacity: hasPlacedBets ? 1 : 0.55,
                transition: "opacity 0.15s ease, color 0.15s ease",
              }}
            >
              CLEAR BETS
            </button>
          )}
          <BalanceBar />
          <SideBets />
          <MainBets />
        </div>
        <div className="min-h-0 overflow-hidden">
          <BaccaratTable />
        </div>
      </div>

      <FlyingChips />
      <WinFlash />
    </div>
  );
}
