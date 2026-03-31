import PlayerHeader from "@/components/player/PlayerHeader";
import ChipSelector from "@/components/player/ChipSelector";
import LiveChat from "@/components/player/LiveChat";
import SideBets from "@/components/player/SideBets";
import MainBets from "@/components/player/MainBets";
import BaccaratTable from "@/components/player/BaccaratTable";
import BalanceBar from "@/components/player/BalanceBar";
import RoadmapPanel from "@/components/player/RoadmapPanel";
import DemoWrapper from "./DemoWrapper";

export default function DemoPage() {
  return (
    <DemoWrapper>
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
          <span className="text-[#6a7282] text-lg select-none">Live video stream</span>
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

        <div className="flex items-center justify-center gap-3" style={{ backgroundColor: "#030712", borderTop: "0.8px solid #1e2939" }}>
          <img src="/logo.png" alt="Play Room Gaming" className="object-contain" style={{ height: "2vh" }} />
          <span className="text-[#6a7282] text-center" style={{ fontSize: "0.9vh" }}>
            DEMO MODE — Play responsibly.
          </span>
        </div>
      </div>
    </DemoWrapper>
  );
}
