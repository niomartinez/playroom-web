"use client";

/**
 * Shared big-road grid renderer used by both the studio BigRoad
 * component and the player RoadmapPanel. Renders columns produced by
 * `buildBigRoadColumns` as outlined circles in a fixed grid, with tie
 * overlays (slash + count badge) on the most recent non-Tie cell.
 */

import { useEffect, useRef, useState } from "react";

import type {
  BigRoadColumn,
  LeadingTie,
} from "@/lib/big-road";

const BANKER_COLOR = "#fb2c36";
const PLAYER_COLOR = "#2b7fff";
const TIE_COLOR = "#00bc7d";

interface BigRoadGridProps {
  columns: BigRoadColumn[];
  leadingTie: LeadingTie | null;
  /** Visible column count. */
  cols: number;
  /** Visible row count. */
  rows: number;
  /** Color of the empty-cell outline. */
  emptyBorderColor?: string;
  /** Background of the grid container. */
  background?: string;
  /** Gap between cells (pixels). */
  gap?: number;
  /**
   * Size the grid to fit its box in BOTH directions rather than only across.
   *
   * The default `1fr` columns derive cell size from width alone, so the grid's
   * height is whatever 6 rows of that width come to — fine when it can have all
   * the height it wants. Under a height budget it just overflowed and the
   * bottom rows were clipped. In `fit` mode the cell is the smaller of what
   * width and height allow, so the road shrinks whole and stays round.
   */
  fit?: boolean;
}

export function BigRoadGrid({
  columns,
  leadingTie,
  cols,
  rows,
  emptyBorderColor = "rgba(255,255,255,0.08)",
  background = "transparent",
  gap = 1,
  fit = false,
}: BigRoadGridProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [cell, setCell] = useState<number | null>(null);

  useEffect(() => {
    if (!fit) return;
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const byWidth = (width - gap * (cols - 1)) / cols;
      const byHeight = (height - gap * (rows - 1)) / rows;
      const next = Math.max(0, Math.floor(Math.min(byWidth, byHeight) * 100) / 100);
      setCell((prev) => (prev !== null && Math.abs(prev - next) < 0.5 ? prev : next));
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [fit, cols, rows, gap]);

  const track = fit && cell !== null ? `${cell}px` : "1fr";

  return (
    <div
      ref={boxRef}
      className={fit ? "flex-1 min-h-0 grid" : "grid flex-1 min-h-0"}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${track})`,
        gridTemplateRows: `repeat(${rows}, ${track})`,
        gap: `${gap}px`,
        background,
        // Fixed px tracks leave slack in the wider direction; centre it so the
        // road doesn't sit against one edge as it shrinks.
        ...(fit ? { justifyContent: "center", alignContent: "center" } : null),
      }}
    >
      {Array.from({ length: cols }).map((_, colIdx) =>
        Array.from({ length: rows }).map((_, rowIdx) => {
          const col = columns[colIdx];
          const cell = col?.cells[rowIdx];
          const isLeadingTieCell = colIdx === 0 && rowIdx === 0 && !col && leadingTie;
          const key = `${colIdx}-${rowIdx}`;

          // Empty cell -- thin outlined circle as background.
          if (!cell?.hasOutcome && !isLeadingTieCell) {
            return (
              <div
                key={key}
                className="flex items-center justify-center"
                style={{ gridColumn: colIdx + 1, gridRow: rowIdx + 1 }}
              >
                <div
                  style={{
                    width: "92%",
                    aspectRatio: "1",
                    borderRadius: "50%",
                    border: `1px solid ${emptyBorderColor}`,
                  }}
                />
              </div>
            );
          }

          // Leading tie (no PB yet): single green dot at row 0 col 0.
          if (isLeadingTieCell) {
            return (
              <div
                key={key}
                className="flex items-center justify-center"
                style={{
                  gridColumn: colIdx + 1,
                  gridRow: rowIdx + 1,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "30%",
                    aspectRatio: "1",
                    borderRadius: "50%",
                    backgroundColor: TIE_COLOR,
                  }}
                />
                {leadingTie!.ties > 1 && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      fontSize: 9,
                      fontWeight: 700,
                      color: TIE_COLOR,
                      lineHeight: 1,
                    }}
                  >
                    {leadingTie!.ties}
                  </span>
                )}
              </div>
            );
          }

          // Occupied cell -- outlined circle in side color, with optional
          // tie slash overlay + count badge.
          const sideColor = col!.outcome === "B" ? BANKER_COLOR : PLAYER_COLOR;
          const tieCount = cell!.ties;
          return (
            <div
              key={key}
              className="flex items-center justify-center"
              style={{
                gridColumn: colIdx + 1,
                gridRow: rowIdx + 1,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "92%",
                  aspectRatio: "1",
                  borderRadius: "50%",
                  border: "2px solid " + sideColor,
                  backgroundColor: "transparent",
                }}
              />
              {tieCount > 0 && (
                <>
                  {/* Diagonal green slash overlaying the circle. */}
                  <div
                    style={{
                      position: "absolute",
                      width: "78%",
                      height: "1.8px",
                      backgroundColor: TIE_COLOR,
                      transform: "rotate(-45deg)",
                      borderRadius: 1,
                      pointerEvents: "none",
                    }}
                  />
                  {tieCount > 1 && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: -1,
                        right: -1,
                        fontSize: 9,
                        fontWeight: 700,
                        color: TIE_COLOR,
                        lineHeight: 1,
                        textShadow: "0 0 2px rgba(0,0,0,0.8)",
                      }}
                    >
                      {tieCount}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

export default BigRoadGrid;
