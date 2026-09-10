"use client";

import { useMemo } from "react";

import { useStudio } from "@/lib/studio-context";
import { buildDerivedRoad, type DerivedRoadKind } from "@/lib/derived-roads";
import { DerivedRoadGrid } from "@/components/shared/DerivedRoadGrid";

interface DerivedRoadProps {
  title: string;
  kind: DerivedRoadKind;
  cols?: number;
  rows?: number;
}

/**
 * One derived road on the studio dashboard, fed from the same Big Road the
 * dealer is writing. Same library and renderer as the player panel, so the
 * dealer and the players always see identical roads.
 */
export default function DerivedRoad({
  title,
  kind,
  cols = 22,
  rows = 6,
}: DerivedRoadProps) {
  const { roads } = useStudio();
  const { columns } = useMemo(
    () =>
      buildDerivedRoad(
        roads.bigRoad.map((e) => e.result),
        kind,
        cols,
        rows,
      ),
    [roads.bigRoad, kind, cols, rows],
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
        padding: "13px",
      }}
    >
      <p
        className="font-semibold shrink-0 mb-2"
        style={{ color: "#f0b100", fontSize: 12, letterSpacing: "0.6px", lineHeight: "16px" }}
      >
        {title}
      </p>

      <DerivedRoadGrid
        columns={columns}
        kind={kind}
        cols={cols}
        rows={rows}
        emptyBorderColor="#392c07"
        gap={1}
        label={title}
      />
    </div>
  );
}
