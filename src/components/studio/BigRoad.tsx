"use client";

import { useMemo } from "react";
import { useStudio } from "@/lib/studio-context";
import { buildBigRoadColumns } from "@/lib/big-road";
import { BigRoadGrid } from "@/components/shared/BigRoadGrid";

const COLS = 30;
const ROWS = 6;

export default function BigRoad() {
  const { roads } = useStudio();
  const totalGames = roads.beadRoad.length;

  const { columns, leadingTie } = useMemo(
    () =>
      buildBigRoadColumns(
        roads.bigRoad.map((e) => e.result),
        COLS,
        ROWS,
      ),
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
          style={{
            color: "#f0b100",
            fontSize: 12,
            letterSpacing: "0.6px",
            lineHeight: "16px",
          }}
        >
          BIG ROAD
        </p>
        <p
          className="font-medium"
          style={{ color: "#6a7282", fontSize: 12, lineHeight: "16px" }}
        >
          Game #{totalGames}
        </p>
      </div>

      <BigRoadGrid
        columns={columns}
        leadingTie={leadingTie}
        cols={COLS}
        rows={ROWS}
        emptyBorderColor="#392c07"
        background="transparent"
        gap={1}
      />
    </div>
  );
}
