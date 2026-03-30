import StudioHeader from "@/components/studio/StudioHeader";
import StudioFooter from "@/components/studio/StudioFooter";
import BeadRoad from "@/components/studio/BeadRoad";
import BigRoad from "@/components/studio/BigRoad";
import DerivedRoad from "@/components/studio/DerivedRoad";
import ScorePanel from "@/components/studio/ScorePanel";
import NextGamePanel from "@/components/studio/NextGamePanel";

export default function StudioDashboard() {
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: "linear-gradient(to right, #000000, #171717, #000000)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <StudioHeader />

      {/* Main 3-column layout */}
      <main className="flex-1 grid min-h-0 p-6 gap-6" style={{ gridTemplateColumns: "128px 1fr 320px" }}>
        {/* Left — Bead Road */}
        <BeadRoad />

        {/* Center — Big Road + Derived Roads */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Big Road takes ~65% of center height */}
          <div className="flex-[2] min-h-0">
            <BigRoad />
          </div>

          {/* Derived roads row: Big Eye full width, then Small Road + Cockroach Pig */}
          <div className="flex-1 min-h-0">
            <DerivedRoad title="BIG EYE" cols={44} rows={6} />
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
            <DerivedRoad title="SMALL ROAD" cols={22} rows={6} />
            <DerivedRoad title="COCKROACH PIG" cols={22} rows={6} />
          </div>
        </div>

        {/* Right — Score Panel + Next Game */}
        <div className="flex flex-col min-h-0 overflow-y-auto">
          <ScorePanel />
          <NextGamePanel />
        </div>
      </main>

      <StudioFooter />
    </div>
  );
}
