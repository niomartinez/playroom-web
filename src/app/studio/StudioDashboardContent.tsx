"use client";

import { useState } from "react";
import StudioHeader from "@/components/studio/StudioHeader";
import StudioFooter from "@/components/studio/StudioFooter";
import BeadRoad from "@/components/studio/BeadRoad";
import BigRoad from "@/components/studio/BigRoad";
import DerivedRoad from "@/components/studio/DerivedRoad";
import ScorePanel from "@/components/studio/ScorePanel";
import NextGamePanel from "@/components/studio/NextGamePanel";
import RoundControls from "@/components/studio/RoundControls";
import ManualInputDialog from "@/components/studio/ManualInputDialog";

export default function StudioDashboardContent() {
  const [manualInputOpen, setManualInputOpen] = useState(false);

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

        {/* Right — Score Panel + Round Controls + Next Game + Manual Input */}
        <div
          className="min-h-0 flex flex-col gap-2"
        >
          <div className="shrink-0">
            <ScorePanel />
          </div>
          <div className="shrink-0">
            <RoundControls />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <NextGamePanel />
          </div>
          <button
            onClick={() => setManualInputOpen(true)}
            className="shrink-0 flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold text-sm text-black hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: "#f0b100",
              boxShadow: "0 4px 15px rgba(208,135,0,0.4)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M8 12h8M12 8v8" />
            </svg>
            Manual Input
          </button>
        </div>
      </main>

      <StudioFooter />

      <ManualInputDialog
        open={manualInputOpen}
        onClose={() => setManualInputOpen(false)}
      />
    </div>
  );
}
