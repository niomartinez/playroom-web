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
      }}
    >
      <StudioHeader />

      {/* Main 3-column layout — fills all remaining space, no scrolling */}
      <main
        className="flex-1 min-h-0 p-4 gap-4"
        style={{
          display: "grid",
          gridTemplateColumns: "8% 1fr 22%",
          gridTemplateRows: "1fr",
        }}
      >
        {/* Left — Bead Road */}
        <BeadRoad />

        {/* Center — Big Road + Derived Roads */}
        <div
          className="min-h-0"
          style={{
            display: "grid",
            gridTemplateRows: "3fr 1fr 1fr",
            gap: "8px",
          }}
        >
          <BigRoad />

          <DerivedRoad title="BIG EYE" cols={44} rows={4} />

          <div className="grid grid-cols-2 gap-2 min-h-0">
            <DerivedRoad title="SMALL ROAD" cols={22} rows={4} />
            <DerivedRoad title="COCKROACH PIG" cols={22} rows={4} />
          </div>
        </div>

        {/* Right — Score Panel + Next Game, proportional split */}
        <div
          className="min-h-0"
          style={{
            display: "grid",
            gridTemplateRows: "3fr 2fr",
            gap: "8px",
          }}
        >
          <div className="overflow-hidden">
            <ScorePanel />
          </div>
          <div className="overflow-hidden">
            <NextGamePanel />
          </div>
        </div>
      </main>

      <StudioFooter />
    </div>
  );
}
