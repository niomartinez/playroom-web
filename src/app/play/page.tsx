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
      className="h-screen overflow-hidden"
      style={{
        display: "grid",
        gridTemplateRows: "5vh 60vh 18vh 8vh 9vh",
        background: "#0a0f1a",
      }}
    >
      {/* 5vh — Header */}
      <PlayerHeader />

      {/* 60vh — Video Stream with overlays */}
      <div className="relative min-h-0 bg-black flex items-center justify-center overflow-hidden">
        <div className="text-[#6a7282] text-lg select-none">Live video stream</div>
        <ChipSelector />
        <LiveChat />
      </div>

      {/* 18vh — Bottom panel: Roadmap | Balance+SideBets | BaccaratTable */}
      <div
        className="min-h-0 px-[0.8vw] py-[0.4vh]"
        style={{
          display: "grid",
          gridTemplateColumns: "22% 37% 41%",
          gap: "0.6vw",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <RoadmapPanel />
        </div>
        <div className="flex flex-col min-h-0 overflow-hidden" style={{ gap: "0.4vh" }}>
          <BalanceBar />
          <SideBets />
        </div>
        <div className="min-h-0 overflow-hidden">
          <BaccaratTable />
        </div>
      </div>

      {/* 8vh — Main Betting Buttons */}
      <div className="min-h-0 px-[0.8vw] py-[0.2vh]">
        <MainBets />
      </div>

      {/* 9vh — Footer */}
      <PlayerFooter />
    </div>
  );
}
