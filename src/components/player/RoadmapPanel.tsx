"use client";

import { useMemo } from "react";

import { useElementSize } from "@/lib/use-visible-height";
import { useGame } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";
import { useT } from "@/lib/i18n";
import { buildBigRoadColumns } from "@/lib/big-road";
import { BigRoadGrid } from "@/components/shared/BigRoadGrid";

// Player big road density. 36 columns made cells ~15px wide (too small);
// 22 columns gives readable circles and still wraps reasonably (cycle ~21
// new outcomes between wraps).
const COLS = 22;
const ROWS = 6;
const MOBILE_GAP = 1;

/**
 * Mobile column count when nothing has been measured yet (first paint, SSR).
 * The real figure is derived from the box — see `mobileCols` below.
 */
const MOBILE_COLS_FALLBACK = 14;

/**
 * Mobile cells are sized from the HEIGHT the layout can spare, then the column
 * count is chosen to fill the width at that size.
 *
 * Fixing the count at 14 and shrinking the cells left the road as a small
 * huddle of circles in the middle of a wide panel, with a dead band down each
 * side — visibly broken. More, smaller columns is both better looking and
 * strictly more information: a longer stretch of the shoe stays on screen.
 */
const MOBILE_MIN_COLS = 14;
const MOBILE_MAX_COLS = 40;

export default function RoadmapPanel() {
  const { roads } = useGame();
  const isMobile = useIsMobile();
  const t = useT();

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
  /* Mobile grid geometry, measured. Cell comes from the height we were given
     (rows are fixed at 6 — that is what a big road IS), and the column count
     then follows from the width so the grid spans it. */
  const { size: gridBox, ref: gridBoxRef } = useElementSize<HTMLDivElement>();
  const mobileCell = gridBox
    ? Math.max(6, (gridBox.h - MOBILE_GAP * (ROWS - 1)) / ROWS)
    : null;
  const mobileCols = mobileCell
    ? Math.min(
        MOBILE_MAX_COLS,
        Math.max(
          MOBILE_MIN_COLS,
          Math.floor((gridBox!.w + MOBILE_GAP) / (mobileCell + MOBILE_GAP)),
        ),
      )
    : MOBILE_COLS_FALLBACK;

  const bigRoadMobile = useMemo(
    () =>
      buildBigRoadColumns(
        roads.bigRoad.map((e) => e.result),
        mobileCols,
        ROWS,
      ),
    [roads.bigRoad, mobileCols],
  );

  /* Prediction percentages — shared between both layouts */
  const total = roads.playerWins + roads.bankerWins + roads.ties;
  const pPct = total > 0 ? Math.round((roads.playerWins / total) * 100) : 0;
  const bPct = total > 0 ? Math.round((roads.bankerWins / total) * 100) : 0;
  const tPct = total > 0 ? Math.round((roads.ties / total) * 100) : 0;

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      // Fills the height its parent allots instead of deciding one for itself.
      // The mobile layout now hands out a height budget so the page fits inside
      // whatever the operator's page and the phone's chrome leave us, and the
      // road is one of the two blocks that gives ground (see PlayerLayout).
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          backgroundColor: "#101828",
          border: "0.8px solid #364153",
          borderRadius: 14,
          padding: `calc(8px * var(--prg-scale, 1))`,
          display: "flex",
          flexDirection: "column",
          gap: `calc(6px * var(--prg-scale, 1))`,
          overflow: "hidden",
        }}
      >
        {/* Big Road Grid */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
          <div
            style={{
              fontSize: `calc(11px * var(--prg-scale, 1))`,
              fontWeight: 600,
              color: "#d1d5dc",
              marginBottom: `calc(4px * var(--prg-scale, 1))`,
              flexShrink: 0,
            }}
          >
            {t("roadmap.bigRoad")}
          </div>
          <div
            ref={gridBoxRef}
            style={{ width: "100%", flex: 1, minHeight: 0, display: "flex" }}
          >
            <BigRoadGrid
              columns={bigRoadMobile.columns}
              leadingTie={bigRoadMobile.leadingTie}
              cols={mobileCols}
              rows={ROWS}
              emptyBorderColor="rgba(54,65,83,0.6)"
              gap={MOBILE_GAP}
              cellPx={mobileCell}
            />
          </div>
        </div>

        {/* Single row: Next Prediction (left) + Standings (right). Never
            shrinks — it's one short line, and squeezing it buys nothing while
            the grid above can give up real height. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {/* Left: Next Prediction */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#99A1AF", fontWeight: 500 }}>{t("roadmap.next")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {[
                { label: "P", bg: "#2b7fff", border: "#51a2ff", pct: pPct },
                { label: "T", bg: "#00c950", border: "#05df72", pct: tPct },
                { label: "B", bg: "#fb2c36", border: "#ff6467", pct: bPct },
              ].map((p) => (
                <div
                  key={p.label}
                  style={{ display: "flex", alignItems: "center", gap: 2 }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      backgroundColor: p.bg,
                      border: `1.2px solid ${p.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 8 }}>{p.label}</span>
                  </div>
                  <span style={{ color: "#99a1af", fontSize: 10 }}>{p.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: P / T / B standings */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
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
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span>{s.label}:</span>
                <span>{s.count}</span>
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
        <div className="font-semibold text-[#d1d5dc] shrink-0" style={{ fontSize: "1.1vh", marginBottom: "0.3vh" }}>{t("roadmap.bigRoad")}</div>
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
          { label: t("roadmap.player"), bg: "#155dfc", text: "#dbeafe", count: roads.playerWins },
          { label: t("roadmap.tie"), bg: "#00a63e", text: "#dcfce7", count: roads.ties },
          { label: t("roadmap.banker"), bg: "#e7000b", text: "#ffe2e2", count: roads.bankerWins },
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
        <div className="font-semibold text-[#d1d5dc]" style={{ fontSize: "1vh", marginBottom: "0.3vh" }}>{t("roadmap.nextPrediction")}</div>
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
