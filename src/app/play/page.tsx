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
    <div className="flex flex-col h-screen overflow-hidden bg-black">
      {/* Header */}
      <PlayerHeader />

      {/* Video Stream Area — relative container for overlays, takes remaining space */}
      <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center">
        {/* Video placeholder */}
        <div className="text-[#6a7282] text-lg select-none">
          Live video stream
        </div>

        {/* Left sidebar: Chip selector */}
        <ChipSelector />

        {/* Right sidebar: Live chat */}
        <LiveChat />
      </div>

      {/* Bottom Panel Area — fixed proportional grid, no scrolling */}
      <div className="flex-shrink-0 bg-[#0a0f1a]">
        {/* Row 1: Roadmap | Balance+SideBets | BaccaratTable */}
        <div className="px-4 pt-4 pb-3">
          <div
            className="min-h-0"
            style={{
              display: "grid",
              gridTemplateColumns: "25% 1fr 35%",
              gap: "16px",
            }}
          >
            {/* Left section: Roadmap */}
            <div className="min-h-0 overflow-hidden">
              <RoadmapPanel />
            </div>

            {/* Center section: Balance + Side Bets */}
            <div className="flex flex-col gap-3 min-h-0">
              <BalanceBar />
              <SideBets />
            </div>

            {/* Right section: Baccarat Table */}
            <div className="min-h-0">
              <BaccaratTable />
            </div>
          </div>
        </div>

        {/* Row 2: Main Betting Buttons */}
        <div className="px-4 pb-3">
          <MainBets />
        </div>
      </div>

      {/* Footer */}
      <PlayerFooter />
    </div>
  );
}
