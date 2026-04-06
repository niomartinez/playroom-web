"use client";

import { useIsMobile } from "@/lib/use-mobile";
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

export default function PlayerLayout({
  footerText = "Play responsibly. This is a demo application for entertainment purposes only.",
}: {
  footerText?: string;
}) {
  const isMobile = useIsMobile();

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
        }}
      >
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
        <MobileActionBar />

        {/* Balance + Chips */}
        <div style={{ padding: "0 19px", marginTop: 16 }}>
          <BalanceBar />
        </div>

        {/* Side Bets */}
        <div style={{ padding: "0 19px", marginTop: 16 }}>
          <SideBets />
        </div>

        {/* Main Bets */}
        <div style={{ padding: "0 19px", marginTop: 16 }}>
          <MainBets />
        </div>

        {/* Roadmap */}
        <div style={{ padding: "0 19px", marginTop: 16 }}>
          <RoadmapPanel />
        </div>

        {/* Score Cards */}
        <div style={{ padding: "0 19px", marginTop: 16, marginBottom: 24 }}>
          <BaccaratTable />
        </div>
      </div>
    );
  }

  // Desktop layout — unchanged from original
  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        display: "grid",
        gridTemplateRows: "5.5vh 1fr 30vh 3vh",
        background: "#0a0f1a",
      }}
    >
      <PlayerHeader />

      <div className="relative min-h-0 overflow-hidden bg-black flex items-center justify-center">
        <DealVisualizer />
        <ChipSelector />
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
          className="min-h-0 overflow-hidden"
          style={{
            display: "grid",
            gridTemplateRows: "25% 28% 1fr",
            gap: "0.4vh",
          }}
        >
          <BalanceBar />
          <SideBets />
          <MainBets />
        </div>
        <div className="min-h-0 overflow-hidden">
          <BaccaratTable />
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-3"
        style={{
          backgroundColor: "#030712",
          borderTop: "0.8px solid #1e2939",
        }}
      >
        <img
          src="/logo.png"
          alt="Play Room Gaming"
          className="object-contain"
          style={{ height: "2vh" }}
        />
        <span
          className="text-[#6a7282] text-center"
          style={{ fontSize: "0.9vh" }}
        >
          {footerText}
        </span>
      </div>
    </div>
  );
}
