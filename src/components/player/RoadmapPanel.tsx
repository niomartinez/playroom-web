"use client";

import { useMemo } from "react";
import { useGame } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";
import { buildBigRoadColumns } from "@/lib/big-road";
import { BigRoadGrid } from "@/components/shared/BigRoadGrid";

const COLS = 36;
const MOBILE_COLS = 18;
const ROWS = 6;

export default function RoadmapPanel() {
  const { roads } = useGame();
  const isMobile = useIsMobile();

  /* Build big road columns (dragon-style with vertical streaks, ties
     overlayed on the most recent non-Tie cell, wrap to last 3 columns
     when the grid fills). */
  const bigRoadDesktop = useMemo(
    () =>
      buildBigRoadColumns(
        roads.bigRoad.map((e) => e.result),
        COLS,
        ROWS,
      ),
    [roads.bigRoad],
  );
  const bigRoadMobile = useMemo(
    () =>
      buildBigRoadColumns(
        roads.bigRoad.map((e) => e.result),
        MOBILE_COLS,
        ROWS,
      ),
    [roads.bigRoad],
  );

  /* Prediction percentages — shared between both layouts */
  const total = roads.playerWins + roads.bankerWins + roads.ties;
  const pPct = total > 0 ? Math.round((roads.playerWins / total) * 100) : 0;
  const bPct = total > 0 ? Math.round((roads.bankerWins / total) * 100) : 0;
  const tPct = total > 0 ? Math.round((roads.ties / total) * 100) : 0;

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <div
        style={{
          width: "100%",
          backgroundColor: "#101828",
          border: "0.8px solid #364153",
          borderRadius: 14,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Big Road Grid */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#d1d5dc",
              marginBottom: 4,
            }}
          >
            Big Road
          </div>
          <div style={{ width: "100%" }}>
            <BigRoadGrid
              columns={bigRoadMobile.columns}
              leadingTie={bigRoadMobile.leadingTie}
              cols={MOBILE_COLS}
              rows={ROWS}
              emptyBorderColor="rgba(54,65,83,0.6)"
              gap={1}
            />
          </div>
        </div>

        {/* Score Summary Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {[
            { label: "P", bg: "#2b7fff", count: roads.playerWins },
            { label: "T", bg: "#00c950", count: roads.ties },
            { label: "B", bg: "#fb2c36", count: roads.bankerWins },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                backgroundColor: s.bg,
                borderRadius: 999,
                padding: "3px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{s.label}:</span>
              <span>{s.count}</span>
            </div>
          ))}
        </div>

        {/* Next Prediction Row */}
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#99A1AF",
              marginBottom: 4,
            }}
          >
            Next Prediction
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {[
              { label: "P", bg: "#2b7fff", border: "#51a2ff", pct: pPct },
              { label: "T", bg: "#00c950", border: "#05df72", pct: tPct },
              { label: "B", bg: "#fb2c36", border: "#ff6467", pct: bPct },
            ].map((p) => (
              <div
                key={p.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: p.bg,
                    border: `1.6px solid ${p.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 10,
                    }}
                  >
                    {p.label}
                  </span>
                </div>
                <span style={{ color: "#99a1af", fontSize: 12 }}>
                  {p.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Desktop layout (unchanged) ── */
  return (
    <div className="flex flex-col h-full" style={{ gap: "0.4vh" }}>
      {/* Big Road Grid -- takes most space */}
      <div
        className="flex-[3] min-h-0 flex flex-col overflow-hidden"
        style={{ backgroundColor: "#101828", border: "0.8px solid #364153", borderRadius: "0.6vw", padding: "0.4vh 0.6vw" }}
      >
        <div className="font-semibold text-[#d1d5dc] shrink-0" style={{ fontSize: "1.1vh", marginBottom: "0.3vh" }}>Big Road</div>
        <BigRoadGrid
          columns={bigRoadDesktop.columns}
          leadingTie={bigRoadDesktop.leadingTie}
          cols={COLS}
          rows={ROWS}
          emptyBorderColor="rgba(54,65,83,0.6)"
          gap={1}
        />
      </div>

      {/* Score Counters */}
      <div className="grid grid-cols-3 shrink-0" style={{ gap: "0.3vw" }}>
        {[
          { label: "Player", bg: "#155dfc", text: "#dbeafe", count: roads.playerWins },
          { label: "Tie", bg: "#00a63e", text: "#dcfce7", count: roads.ties },
          { label: "Banker", bg: "#e7000b", text: "#ffe2e2", count: roads.bankerWins },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center justify-center" style={{ backgroundColor: s.bg, borderRadius: "0.5vw", padding: "0.5vh 0" }}>
            <span className="text-white font-bold" style={{ fontSize: "1.8vh" }}>{s.count}</span>
            <span style={{ color: s.text, fontSize: "0.9vh" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Next Prediction */}
      <div
        className="shrink-0 flex flex-col"
        style={{ backgroundColor: "#101828", border: "0.8px solid #364153", borderRadius: "0.6vw", padding: "0.4vh 0.6vw" }}
      >
        <div className="font-semibold text-[#d1d5dc]" style={{ fontSize: "1vh", marginBottom: "0.3vh" }}>Next Prediction</div>
        <div className="flex items-center justify-center" style={{ gap: "1vw" }}>
          {[
            { label: "P", bg: "#2b7fff", border: "#51a2ff", pct: pPct },
            { label: "T", bg: "#00c950", border: "#05df72", pct: tPct },
            { label: "B", bg: "#fb2c36", border: "#ff6467", pct: bPct },
          ].map((p) => (
            <div key={p.label} className="flex items-center" style={{ gap: "0.3vw" }}>
              <div className="rounded-full flex items-center justify-center" style={{ width: "2.2vh", height: "2.2vh", backgroundColor: p.bg, border: `1.6px solid ${p.border}` }}>
                <span className="text-white font-bold" style={{ fontSize: "1vh" }}>{p.label}</span>
              </div>
              <span className="text-[#99a1af]" style={{ fontSize: "1.2vh" }}>{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
