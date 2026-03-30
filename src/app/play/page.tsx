import PlayerHeader from "@/components/player/PlayerHeader";
import ChipSelector from "@/components/player/ChipSelector";
import LiveChat from "@/components/player/LiveChat";
import SideBets from "@/components/player/SideBets";
import MainBets from "@/components/player/MainBets";
import BaccaratTable from "@/components/player/BaccaratTable";
import BalanceBar from "@/components/player/BalanceBar";
import PlayerFooter from "@/components/player/PlayerFooter";
import RoadmapPanel from "@/components/player/RoadmapPanel";

export default function PlayPage() {
  return (
    <div
      className="h-screen overflow-hidden bg-[#0a0f1a]"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto auto auto",
      }}
    >
      {/* Row 1: Header */}
      <PlayerHeader />

      {/* Row 2: Video Stream — takes all remaining space */}
      <div className="relative min-h-0 bg-black flex items-center justify-center overflow-hidden">
        <div className="text-[#6a7282] text-lg select-none">
          Live video stream
        </div>
        <ChipSelector />
        <LiveChat />
      </div>

      {/* Row 3: Bottom panel — Roadmap | Balance+SideBets | BaccaratTable */}
      <div
        className="min-h-0 px-3 pt-3 pb-2"
        style={{
          display: "grid",
          gridTemplateColumns: "25% 1fr 32%",
          gap: "12px",
          maxHeight: "35vh",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <RoadmapPanel />
        </div>
        <div className="flex flex-col gap-2 min-h-0 overflow-hidden">
          <BalanceBar />
          <SideBets />
        </div>
        <div className="min-h-0 overflow-hidden">
          <BaccaratTable />
        </div>
      </div>

      {/* Row 4: Main Betting Buttons */}
      <div className="px-3 pb-2">
        <MainBets />
      </div>

      {/* Row 5: Footer */}
      <PlayerFooter />
    </div>
  );
}
