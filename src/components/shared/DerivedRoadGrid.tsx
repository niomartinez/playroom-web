"use client";

/**
 * Grid renderer for the three derived roads, shared by the player RoadmapPanel
 * and the studio dashboard. Takes columns from `buildDerivedRoad` (Big Road
 * column form: `"B"` carries red, `"P"` carries blue) and draws each road in
 * its conventional mark so a player can tell them apart without labels:
 *
 *   Big Eye Boy    hollow ring
 *   Small Road     solid dot
 *   Cockroach Pig  diagonal slash
 *
 * Geometry mirrors `BigRoadGrid`: `1fr` tracks by default, or explicit `cellPx`
 * tracks when the caller has solved the cell from the height it can spare.
 */

import type { BigRoadColumn } from "@/lib/big-road";
import type { DerivedRoadKind, Mark } from "@/lib/derived-roads";

export const RED = "#fb2c36";
export const BLUE = "#2b7fff";

export function markColor(mark: Mark): string {
  return mark === "red" ? RED : BLUE;
}

interface DerivedRoadGridProps {
  columns: BigRoadColumn[];
  kind: DerivedRoadKind;
  cols: number;
  rows: number;
  emptyBorderColor?: string;
  gap?: number;
  cellPx?: number | null;
  /** Accessible name; the compact player panel shows no visible title. */
  label?: string;
}

/**
 * One mark, sized relative to its cell. Exported so the ask-road indicator
 * can draw the same shapes at a fixed pixel size.
 */
export function DerivedMark({
  kind,
  color,
  size,
}: {
  kind: DerivedRoadKind;
  color: string;
  size: string;
}) {
  if (kind === "bigEye") {
    return (
      <div
        style={{
          width: size,
          aspectRatio: "1",
          borderRadius: "50%",
          border: `1.5px solid ${color}`,
          boxSizing: "border-box",
        }}
      />
    );
  }
  if (kind === "smallRoad") {
    return (
      <div
        style={{
          width: size,
          aspectRatio: "1",
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
    );
  }
  // Cockroach Pig: a "/" stroke. A gradient stripe keeps the stroke
  // proportional to the cell without needing a resolvable parent height.
  return (
    <div
      style={{
        width: size,
        aspectRatio: "1",
        background: `linear-gradient(135deg, transparent 42%, ${color} 42%, ${color} 58%, transparent 58%)`,
      }}
    />
  );
}

export function DerivedRoadGrid({
  columns,
  kind,
  cols,
  rows,
  emptyBorderColor = "rgba(54,65,83,0.6)",
  gap = 1,
  cellPx = null,
  label,
}: DerivedRoadGridProps) {
  const track = cellPx && cellPx > 0 ? `${cellPx}px` : "1fr";
  const markSize = kind === "smallRoad" ? "78%" : kind === "cockroach" ? "96%" : "92%";

  return (
    <div
      className="grid flex-1 min-h-0"
      role="img"
      aria-label={label}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${track})`,
        gridTemplateRows: `repeat(${rows}, ${track})`,
        gap: `${gap}px`,
        ...(cellPx ? { justifyContent: "center", alignContent: "start" } : null),
      }}
    >
      {Array.from({ length: cols }).map((_, colIdx) =>
        Array.from({ length: rows }).map((_, rowIdx) => {
          const col = columns[colIdx];
          const cell = col?.cells[rowIdx];
          const key = `${colIdx}-${rowIdx}`;
          return (
            <div
              key={key}
              className="flex items-center justify-center"
              style={{ gridColumn: colIdx + 1, gridRow: rowIdx + 1 }}
            >
              {cell?.hasOutcome ? (
                <DerivedMark
                  kind={kind}
                  color={col!.outcome === "B" ? RED : BLUE}
                  size={markSize}
                />
              ) : (
                <div
                  style={{
                    width: "92%",
                    aspectRatio: "1",
                    borderRadius: "50%",
                    border: `1px solid ${emptyBorderColor}`,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

export default DerivedRoadGrid;
