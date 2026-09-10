"use client";

import { useMemo, type CSSProperties } from "react";

import { useElementSize } from "@/lib/use-visible-height";
import { useGame } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";
import { useT } from "@/lib/i18n";
import { buildBigRoadColumns, type Outcome } from "@/lib/big-road";
import {
  buildDerivedRoad,
  DERIVED_ROAD_KINDS,
  type DerivedRoadKind,
} from "@/lib/derived-roads";
import { BigRoadGrid } from "@/components/shared/BigRoadGrid";
import { DerivedRoadGrid } from "@/components/shared/DerivedRoadGrid";
import { AskRoadMarks } from "@/components/shared/AskRoadMarks";

/**
 * The road panel: Big Road on top, the three derived roads (Big Eye Boy,
 * Small Road, Cockroach Pig) in a strip beneath, and one or two lines of
 * standings and next-hand prediction with the ask-road marks.
 *
 * Both layouts size the roads from the box they are given rather than the
 * other way round — the phone slot is a fixed height budget (PlayerLayout)
 * and the desktop column is a fixed share of the viewport. The chrome is
 * compact on purpose: no panel title, tight padding, so the height goes to
 * cells rather than labels. That is how every mobile baccarat UI fits four
 * roads in the space we used to spend on one.
 */

const ROWS = 6;
const GAP = 1;
const BORDER = 1.6; // 0.8px each side

/* ── Mobile geometry ────────────────────────────────────────────────────── */
const M_PAD = 6;
const M_BLOCK_GAP = 4;
const M_LINE_H = 16;
const M_STRIP_ROWS = 3;
const M_STRIP_SCALE = 0.62;
/**
 * The Big Road gives up cell size for this many columns beyond what the
 * height alone would allow. The freed height goes to the derived strip.
 */
const M_EXTRA_COLS = 2;
const M_MIN_COLS = 14;
const M_MAX_COLS = 40;
const M_STRIP_GAP = 4;

/* ── Desktop geometry ───────────────────────────────────────────────────── */
const D_PAD_V = 5;
const D_PAD_H = 7;
const D_LINE_H = 16;
const D_LINES_GAP = 4 + 4 + 3; // strip, pills, next
const D_STRIP_ROWS = 6;
const D_STRIP_SCALE = 0.6;
const D_MIN_COLS = 8;
const D_MAX_COLS = 40;
const D_STRIP_GAP = 6;

const STRIP_MIN_COLS = 6;

function fitCols(width: number, cell: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor((width + GAP) / (cell + GAP))));
}

interface Geometry {
  cell: number | null;
  cols: number;
  strip: number | null;
  stripCols: number;
}

function mobileGeometry(box: { w: number; h: number } | null): Geometry {
  if (!box) return { cell: null, cols: M_MIN_COLS, strip: null, stripCols: 8 };
  const innerW = box.w - 2 * M_PAD - BORDER;
  const innerH = box.h - 2 * M_PAD - BORDER;
  const roadsH = innerH - M_LINE_H - 2 * M_BLOCK_GAP;
  // What the height alone would allow, then trade cell size for columns.
  const cellFromHeight = Math.max(
    6,
    (roadsH - (ROWS - 1) * GAP - (M_STRIP_ROWS - 1) * GAP) / (ROWS + M_STRIP_ROWS * M_STRIP_SCALE),
  );
  const cols = Math.min(
    M_MAX_COLS,
    fitCols(innerW, cellFromHeight, M_MIN_COLS, M_MAX_COLS) + M_EXTRA_COLS,
  );
  const cell = Math.max(6, (innerW + GAP) / cols - GAP);
  const rest = roadsH - (cell * ROWS + (ROWS - 1) * GAP);
  const strip = Math.max(
    5,
    Math.min((rest - (M_STRIP_ROWS - 1) * GAP) / M_STRIP_ROWS, cell * M_STRIP_SCALE),
  );
  const stripW = (innerW - 2 * M_STRIP_GAP) / 3;
  return { cell, cols, strip, stripCols: fitCols(stripW, strip, STRIP_MIN_COLS, M_MAX_COLS) };
}

function desktopGeometry(box: { w: number; h: number } | null): Geometry {
  if (!box) return { cell: null, cols: 14, strip: null, stripCols: 8 };
  const innerW = box.w - 2 * D_PAD_H - BORDER;
  const innerH = box.h - 2 * D_PAD_V - BORDER;
  const roadsH = innerH - 2 * D_LINE_H - D_LINES_GAP;
  let cell = Math.max(
    6,
    (roadsH - (ROWS - 1) * GAP - (D_STRIP_ROWS - 1) * GAP) / (ROWS + D_STRIP_ROWS * D_STRIP_SCALE),
  );
  // Never fewer than D_MIN_COLS: a narrow column shrinks the cell instead.
  const maxCellForMinCols = (innerW + GAP) / D_MIN_COLS - GAP;
  cell = Math.min(cell, maxCellForMinCols);
  const cols = fitCols(innerW, cell, D_MIN_COLS, D_MAX_COLS);
  const strip = cell * D_STRIP_SCALE;
  const stripW = (innerW - 2 * D_STRIP_GAP) / 3;
  return { cell, cols, strip, stripCols: fitCols(stripW, strip, STRIP_MIN_COLS, D_MAX_COLS) };
}

/* ── Shared pieces ──────────────────────────────────────────────────────── */

const PANEL: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  boxSizing: "border-box",
  backgroundColor: "#101828",
  border: "0.8px solid #364153",
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const SIDES = [
  { label: "P", key: "P" as const, bg: "#2b7fff", border: "#51a2ff" },
  { label: "T", key: "T" as const, bg: "#00c950", border: "#05df72" },
  { label: "B", key: "B" as const, bg: "#fb2c36", border: "#ff6467" },
];

function NextLine({
  outcomes,
  counts,
  t,
}: {
  outcomes: Outcome[];
  counts: { P: number; T: number; B: number };
  t: (k: string) => string;
}) {
  const total = counts.P + counts.B + counts.T;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
      <span style={{ fontSize: 10, color: "#99A1AF", fontWeight: 500 }}>{t("roadmap.next")}</span>
      {SIDES.map((s) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: s.bg,
              border: `1.2px solid ${s.border}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 8 }}>{s.label}</span>
          </div>
          {s.key !== "T" && (
            <AskRoadMarks
              outcomes={outcomes}
              side={s.key}
              label={`${t("roadmap.askRoad")} ${s.label}`}
            />
          )}
          <span style={{ color: "#99a1af", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>
            {pct(counts[s.key])}%
          </span>
        </div>
      ))}
    </div>
  );
}

function Standings({ counts, compact }: { counts: { P: number; T: number; B: number }; compact: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
      {SIDES.map((s) => (
        <div
          key={s.key}
          style={{
            backgroundColor: s.bg,
            borderRadius: 999,
            padding: compact ? "1px 7px" : "2px 8px",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "12px",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <span>{s.label}:</span>
          <span>{counts[s.key]}</span>
        </div>
      ))}
    </div>
  );
}

function DerivedStrip({
  outcomes,
  geometry,
  rows,
  gap,
  labels,
}: {
  outcomes: Outcome[];
  geometry: Geometry;
  rows: number;
  gap: number;
  labels: Record<DerivedRoadKind, string>;
}) {
  const roads = useMemo(
    () =>
      DERIVED_ROAD_KINDS.map((kind) => ({
        kind,
        road: buildDerivedRoad(outcomes, kind, geometry.stripCols, rows),
      })),
    [outcomes, geometry.stripCols, rows],
  );
  return (
    <div
      style={{
        display: "flex",
        gap,
        flexShrink: 0,
        height: geometry.strip ? geometry.strip * rows + (rows - 1) * GAP : undefined,
      }}
    >
      {roads.map(({ kind, road }) => (
        <div key={kind} style={{ flex: 1, minWidth: 0, display: "flex" }}>
          <DerivedRoadGrid
            columns={road.columns}
            kind={kind}
            cols={geometry.stripCols}
            rows={rows}
            gap={GAP}
            cellPx={geometry.strip}
            label={labels[kind]}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Panel ──────────────────────────────────────────────────────────────── */

export default function RoadmapPanel() {
  const { roads } = useGame();
  const isMobile = useIsMobile();
  const t = useT();

  const outcomes = useMemo<Outcome[]>(() => roads.bigRoad.map((e) => e.result), [roads.bigRoad]);
  const counts = { P: roads.playerWins, T: roads.ties, B: roads.bankerWins };
  const labels = useMemo<Record<DerivedRoadKind, string>>(
    () => ({
      bigEye: t("roadmap.bigEye"),
      smallRoad: t("roadmap.smallRoad"),
      cockroach: t("roadmap.cockroach"),
    }),
    [t],
  );

  const { size: box, ref: boxRef } = useElementSize<HTMLDivElement>();
  const geometry = useMemo(
    () => (isMobile ? mobileGeometry(box) : desktopGeometry(box)),
    [isMobile, box],
  );

  const bigRoad = useMemo(
    () => buildBigRoadColumns(outcomes, geometry.cols, ROWS),
    [outcomes, geometry.cols],
  );

  const bigRoadBox: CSSProperties = geometry.cell
    ? { flex: "0 0 auto", height: geometry.cell * ROWS + (ROWS - 1) * GAP, display: "flex" }
    : { flex: 1, minHeight: 0, display: "flex" };

  /* ── Mobile: Big Road, derived strip, one line ── */
  if (isMobile) {
    return (
      <div
        ref={boxRef}
        style={{ ...PANEL, padding: M_PAD, gap: M_BLOCK_GAP }}
        aria-label={t("roadmap.bigRoad")}
      >
        <div style={bigRoadBox}>
          <BigRoadGrid
            columns={bigRoad.columns}
            leadingTie={bigRoad.leadingTie}
            cols={geometry.cols}
            rows={ROWS}
            emptyBorderColor="rgba(54,65,83,0.6)"
            gap={GAP}
            cellPx={geometry.cell}
          />
        </div>
        <DerivedStrip
          outcomes={outcomes}
          geometry={geometry}
          rows={M_STRIP_ROWS}
          gap={M_STRIP_GAP}
          labels={labels}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            flexShrink: 0,
            height: M_LINE_H,
          }}
        >
          <NextLine outcomes={outcomes} counts={counts} t={t} />
          <Standings counts={counts} compact />
        </div>
      </div>
    );
  }

  /* ── Desktop: Big Road, derived strip, standings line, next line ── */
  return (
    <div
      ref={boxRef}
      style={{ ...PANEL, padding: `${D_PAD_V}px ${D_PAD_H}px`, borderRadius: "0.6vw" }}
      aria-label={t("roadmap.bigRoad")}
    >
      <div style={bigRoadBox}>
        <BigRoadGrid
          columns={bigRoad.columns}
          leadingTie={bigRoad.leadingTie}
          cols={geometry.cols}
          rows={ROWS}
          emptyBorderColor="rgba(54,65,83,0.6)"
          gap={GAP}
          cellPx={geometry.cell}
        />
      </div>
      <div style={{ marginTop: 4, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
          <DerivedStrip
            outcomes={outcomes}
            geometry={geometry}
            rows={D_STRIP_ROWS}
            gap={D_STRIP_GAP}
            labels={labels}
          />
        </div>
      </div>
      <div style={{ marginTop: 4, display: "flex", justifyContent: "center", height: D_LINE_H, flexShrink: 0 }}>
        <Standings counts={counts} compact />
      </div>
      <div style={{ marginTop: 3, display: "flex", justifyContent: "center", height: D_LINE_H, flexShrink: 0 }}>
        <NextLine outcomes={outcomes} counts={counts} t={t} />
      </div>
    </div>
  );
}
