"use client";

/**
 * Shared big-road grid renderer used by both the studio BigRoad
 * component and the player RoadmapPanel. Renders columns produced by
 * `buildBigRoadColumns` as outlined circles in a fixed grid, with tie
 * overlays (slash + count badge) on the most recent non-Tie cell.
 */

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
}

export function BigRoadGrid({
  columns,
  leadingTie,
  cols,
  rows,
  emptyBorderColor = "rgba(255,255,255,0.08)",
  background = "transparent",
  gap = 1,
}: BigRoadGridProps) {
  return (
    <div
      className="grid flex-1 min-h-0"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: `${gap}px`,
        background,
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
