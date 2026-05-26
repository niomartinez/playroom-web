"use client";

import { useState } from "react";
import { useIsMobile } from "@/lib/use-mobile";
import { useGame } from "@/lib/game-context";
import PlayerHeader from "./PlayerHeader";
import LiveChat from "./LiveChat";
import SideBets from "./SideBets";
import MainBets from "./MainBets";
import BaccaratTable from "./BaccaratTable";
import BalanceBar from "./BalanceBar";
import RoadmapPanel from "./RoadmapPanel";
import DealVisualizer from "./DealVisualizer";
import VideoPlayer from "./VideoPlayer";
import MobileActionBar from "./MobileActionBar";
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
  const { roundStatus, placedBets, cancelPlacedBets, webrtcUrl, hlsUrl } = useGame();
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
          <VideoPlayer
            webrtcUrl={webrtcUrl}
            hlsUrl={hlsUrl}
            fallback={<DealVisualizer />}
          />
        </div>

        {/* Roadmap — moved ABOVE the bet panel so the road is the first
            thing the player sees after the video stream. Players asked for
            this hierarchy because the road is what they consult before
            betting; previously they had to scroll past the bet buttons. */}
        <div style={{ padding: "8px 19px 0 19px" }}>
          <RoadmapPanel />
        </div>

        {/* Bet panel — wraps Balance + Side Bets + Main Bets so the pulse outlines the whole area */}
        <div
          className={panelClass}
          style={{
            margin: "10px 19px 12px 19px",
            padding: 10,
            borderRadius: 16,
            border: "1.5px solid rgba(54, 65, 83, 0.6)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          <BalanceBar />

          {/* Clear bets — only when betting is open */}
          {isBettingOpen && (
            <button
              onClick={cancelPlacedBets}
              disabled={!hasPlacedBets}
              style={{
                alignSelf: "flex-end",
                padding: "6px 12px",
                borderRadius: 10,
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(208,135,0,0.3)",
                color: hasPlacedBets ? "#f0b100" : "rgba(240,177,0,0.4)",
                fontSize: 11,
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

        {/* Action Bar — Live Chat only (tips removed) */}
        <MobileActionBar
          onChatPress={() => setShowChat((v) => !v)}
          chatEnabled
        />

        {/* Live Chat overlay */}
        {showChat && (
          <div style={{ padding: "0 19px" }}>
            <LiveChat mobile />
          </div>
        )}

        {/* Score Cards — below the fold */}
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
        <VideoPlayer
          webrtcUrl={webrtcUrl}
          hlsUrl={hlsUrl}
          fallback={<DealVisualizer />}
        />
        <LiveChat />
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
          {/* Clear bets is rendered inline inside BalanceBar so it sits
              in the same row as the chips, in the space between balance
              and the chip selector. */}
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
