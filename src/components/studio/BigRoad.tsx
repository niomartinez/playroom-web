"use client";

import { useMemo } from "react";
import { useStudio } from "@/lib/studio-context";
import type { RoadEntry } from "@/lib/game-context";

const COLS = 44;
const ROWS = 18;

const RESULT_COLORS: Record<string, string> = {
  B: "#fb2c36",
  P: "#2b7fff",
  T: "#00bc7d",
};

/**
 * Compute the big road 2D grid layout from a flat list of results.
 * Big Road rules:
 * - Each new streak (change of winner) starts a new column.
 * - Ties are marked on the last entry but don't start a new column.
 * - If a column exceeds the row count, it wraps right (dragon tail).
 */
function computeBigRoadGrid(
  entries: RoadEntry[],
  maxCols: number,
  maxRows: number,
): (RoadEntry | null)[][] {
  // grid[col][row]
  const grid: (RoadEntry | null)[][] = Array.from({ length: maxCols }, () =>
    Array.from({ length: maxRows }, () => null),
  );

  let col = 0;
  let row = 0;
  let lastResult: "P" | "B" | null = null;

  for (const entry of entries) {
    // Ties don't move position in the big road; skip for layout purposes
    if (entry.result === "T") continue;

    if (entry.result !== lastResult) {
      // Start a new column (unless this is the very first entry)
      if (lastResult !== null) {
        col++;
        row = 0;
      }
      lastResult = entry.result;
    } else {
      // Continue down the same column
      row++;
    }

    // Dragon tail: if we exceed rows, move right along the bottom
    if (row >= maxRows) {
      row = maxRows - 1;
      col++;
    }

    if (col < maxCols && row < maxRows) {
      grid[col][row] = entry;
    }
  }

  return grid;
}

export default function BigRoad() {
  const { roads } = useStudio();
  const totalGames = roads.beadRoad.length;

  const grid = useMemo(
    () => computeBigRoadGrid(roads.bigRoad, COLS, ROWS),
    [roads.bigRoad],
  );

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: "linear-gradient(104deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        borderRadius: 10,
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
        padding: "13px 17px",
      }}
    >
      <div className="flex items-center justify-between mb-2 shrink-0">
        <p
          className="font-semibold"
          style={{ color: "#f0b100", fontSize: 12, letterSpacing: "0.6px", lineHeight: "16px" }}
        >
          BIG ROAD
        </p>
        <p className="font-medium" style={{ color: "#6a7282", fontSize: 12, lineHeight: "16px" }}>
          Game #{totalGames}
        </p>
      </div>

      <div
        className="grid flex-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: "1px",
        }}
      >
        {Array.from({ length: COLS }).map((_, colIdx) =>
          Array.from({ length: ROWS }).map((_, rowIdx) => {
            const entry = grid[colIdx]?.[rowIdx] ?? null;
            const key = `${colIdx}-${rowIdx}`;

            return (
              <div
                key={key}
                className="flex items-center justify-center"
                style={{ gridColumn: colIdx + 1, gridRow: rowIdx + 1 }}
              >
                {entry ? (
                  <div
                    style={{
                      width: "80%",
                      aspectRatio: "1",
                      borderRadius: "9999px",
                      border: `2px solid ${RESULT_COLORS[entry.result] ?? "#392c07"}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "80%",
                      aspectRatio: "1",
                      borderRadius: "9999px",
                      border: "1px solid #392c07",
                    }}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
