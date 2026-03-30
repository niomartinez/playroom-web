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
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <PlayerHeader />

      {/* Video Stream Area — relative container for overlays */}
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-[400px]">
        {/* Video placeholder */}
        <div className="text-[#6a7282] text-lg select-none">
          Live video stream
        </div>

        {/* Left sidebar: Chip selector */}
        <ChipSelector />

        {/* Right sidebar: Live chat */}
        <LiveChat />
      </div>

      {/* Bottom Panel Area */}
      <div className="bg-[#0a0f1a]">
        {/* Row 1: Balance + Side Bets + Card Display */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Left section: Roadmap + Scores */}
            <div className="col-span-3">
              <div className="bg-[#101828] border border-[#364153] rounded-[14px] p-4">
                <RoadmapPanel />
              </div>
            </div>

            {/* Center section: Balance + Side Bets */}
            <div className="col-span-5 flex flex-col gap-3">
              <BalanceBar />
              <SideBets />
            </div>

            {/* Right section: Baccarat Table */}
            <div className="col-span-4">
              <BaccaratTable />
            </div>
          </div>
        </div>

        {/* Row 2: Main Betting Buttons */}
        <div className="px-4 pb-4">
          <MainBets />
        </div>
      </div>

      {/* Footer */}
      <PlayerFooter />
    </div>
  );
}
