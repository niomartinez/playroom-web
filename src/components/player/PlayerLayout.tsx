"use client";

import { useIsMobile } from "@/lib/use-mobile";
import { useGame } from "@/lib/game-context";
import { useFeatures } from "@/lib/use-features";
import PlayerHeader from "./PlayerHeader";
import LiveChat from "./LiveChat";
import MobileChat from "./MobileChat";
import SideBets from "./SideBets";
import MainBets from "./MainBets";
import BaccaratTable from "./BaccaratTable";
import BalanceBar from "./BalanceBar";
import RoadmapPanel from "./RoadmapPanel";
import DealVisualizer from "./DealVisualizer";
import VideoPlayer from "./VideoPlayer";
import RoundCountdown from "./RoundCountdown";
import TableInfoBar from "./TableInfoBar";
import { PAD_CARD_KEYFRAMES } from "./PadCards";
import VideoQuickIcons from "./VideoQuickIcons";
import WinnersMarquee from "./WinnersMarquee";
import FlyingChips from "./FlyingChips";
import WinFlash from "./WinFlash";
import LowBalanceGate from "./LowBalanceGate";

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
  const { roundStatus, webrtcUrl, hlsUrl } = useGame();
  const { live_chat_enabled: liveChatEnabled } = useFeatures();
  // While the hand is being dealt, give the video more room: betting is closed,
  // so the bet panel has nothing the player can act on, and the deal is the only
  // thing worth looking at. Restores itself when the next round opens.
  const dealing = roundStatus === "dealing" || roundStatus === "result";

  const isBettingOpen = roundStatus === "betting_open";
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
      <style>{PAD_CARD_KEYFRAMES}</style>
        <style>{PAD_CARD_KEYFRAMES}</style>

        {/* Header — sticky */}
        <div style={{ position: "sticky", top: 0, zIndex: 50 }}>
          <PlayerHeader />
        </div>

        {/* Video / Deal area — 16:9, widening to 4:3 while the hand is dealt so
            the deal gets more of a small screen. Animated on aspect-ratio so the
            page below reflows smoothly instead of snapping. */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: dealing ? "4 / 3" : "16 / 9",
            transition: "aspect-ratio 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
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
          <RoundCountdown />
          <WinnersMarquee />
          <LowBalanceGate />
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
          {/* BalanceBar renders the balance + CLEAR BETS (right, above chips)
              + the chip row with the ×2 toggle. */}
          <BalanceBar />

          <SideBets />
          <MainBets />
        </div>

        {/* Live Chat — EVO-style floating button + translucent bottom sheet.
            Gated on the admin live_chat_enabled feature flag. */}
        {liveChatEnabled && <MobileChat />}

        {/* Score Cards — below the fold. The bottom margin also reserves room
            for the pinned TableInfoBar so it never covers the last row. */}
        <div
          style={{
            padding: "0 19px",
            marginTop: 16,
            marginBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <BaccaratTable />
        </div>

        <FlyingChips />
        <WinFlash />

        {/* Pinned to the bottom of the VIEWPORT, Evolution-style — not to the end
            of the scroll, where it would only appear after scrolling past the
            score cards. The scroll container reserves matching space below so it
            never covers the last row of content. */}
        <TableInfoBar fixed />
      </div>
    );
  }

  // Desktop layout
  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        display: "grid",
        // 4th row = the bottom info strip. Declared EXPLICITLY: adding a
        // fourth child to a three-row template made the grid invent an
        // implicit row and collapsed the video row into a huge gap.
        gridTemplateRows: dealing ? "5.5vh 1fr 20vh auto" : "5.5vh 1fr 30vh auto",
        transition: "grid-template-rows 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
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
        <RoundCountdown />
        <WinnersMarquee />
        <LowBalanceGate />
        <VideoQuickIcons />
        {liveChatEnabled && <LiveChat />}
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

      <TableInfoBar />

      <FlyingChips />
      <WinFlash />
    </div>
  );
}
