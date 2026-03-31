"use client";

import { useStudio } from "@/lib/studio-context";

const COLS = 5;
const ROWS = 20;

const RESULT_COLORS: Record<string, string> = {
  B: "#fb2c36",
  P: "#2b7fff",
  T: "#00bc7d",
};

const RESULT_LABELS: Record<string, string> = {
  B: "B",
  P: "P",
  T: "T",
};

export default function BeadRoad() {
  const { roads } = useStudio();
  const entries = roads.beadRoad;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: "linear-gradient(104deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        borderRadius: 10,
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
        padding: "13px",
      }}
    >
      <p
        className="font-semibold shrink-0 mb-2"
        style={{ color: "#f0b100", fontSize: 12, letterSpacing: "0.6px", lineHeight: "16px" }}
      >
        BEAD ROAD
      </p>

      <div
        className="grid flex-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: "2px",
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => {
          // Bead road fills column by column (top to bottom, then next column)
          const col = Math.floor(i / ROWS);
          const row = i % ROWS;
          const entryIdx = col * ROWS + row;
          const entry = entryIdx < entries.length ? entries[entryIdx] : null;

          return (
            <div key={i} className="flex items-center justify-center">
              {entry ? (
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: "80%",
                    aspectRatio: "1",
                    borderRadius: "9999px",
                    backgroundColor: RESULT_COLORS[entry.result] ?? "#392c07",
                  }}
                >
                  <span className="font-bold text-white" style={{ fontSize: "clamp(8px, 0.7vw, 11px)" }}>
                    {RESULT_LABELS[entry.result]}
                  </span>
                </div>
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
        })}
      </div>
    </div>
  );
}
