import PlayerHeader from "@/components/player/PlayerHeader";
import ChipSelector from "@/components/player/ChipSelector";
import LiveChat from "@/components/player/LiveChat";
import SideBets from "@/components/player/SideBets";
import MainBets from "@/components/player/MainBets";
import BaccaratTable from "@/components/player/BaccaratTable";
import BalanceBar from "@/components/player/BalanceBar";
import RoadmapPanel from "@/components/player/RoadmapPanel";

export default function PlayPage() {
  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        display: "grid",
        gridTemplateRows: "4vh 1fr 16vh 14vh 2.5vh 1.5vh",
        background: "#0a0f1a",
      }}
    >
      {/* 4vh — Header */}
      <PlayerHeader />

      {/* 54vh — Video Stream with overlays */}
      <div className="relative min-h-0 overflow-hidden">
        <img
          src="/stream-placeholder.png"
          alt="Live stream"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <ChipSelector />
        <LiveChat />
      </div>

      {/* 16vh — Bottom panel: Roadmap | Balance+SideBets | BaccaratTable */}
      <div
        className="min-h-0 px-[0.8vw] py-[0.3vh]"
        style={{
          display: "grid",
          gridTemplateColumns: "22% 37% 41%",
          gap: "0.6vw",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <RoadmapPanel />
        </div>
        <div className="flex flex-col min-h-0 overflow-hidden" style={{ gap: "0.3vh" }}>
          <BalanceBar />
          <SideBets />
        </div>
        <div className="min-h-0 overflow-hidden">
          <BaccaratTable />
        </div>
      </div>

      {/* 12vh — Main Betting Buttons */}
      <div className="min-h-0 px-[0.8vw] py-[0.3vh]">
        <MainBets />
      </div>

      {/* 3vh — Logo */}
      <div className="flex items-center justify-center" style={{ backgroundColor: "#030712" }}>
        <img src="/logo.png" alt="Play Room Gaming" className="object-contain" style={{ height: "2.5vh" }} />
      </div>

      {/* 2vh — Disclaimer */}
      <div className="flex items-center justify-center" style={{ backgroundColor: "#030712" }}>
        <span className="text-[#6a7282] text-center" style={{ fontSize: "0.9vh" }}>
          Play responsibly. This is a demo application for entertainment purposes only.
        </span>
      </div>
    </div>
  );
}
