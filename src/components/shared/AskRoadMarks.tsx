"use client";

/**
 * "Ask road" indicator: the mark each derived road would draw if the next
 * hand went to `side`. Three tiny marks in road order (Big Eye Boy, Small
 * Road, Cockroach Pig), always visible so a phone player never has to tap to
 * see them. A road that has not started yet shows a faint empty ring.
 */

import { useMemo } from "react";

import type { Outcome, Side } from "@/lib/big-road";
import { askRoad, DERIVED_ROAD_KINDS } from "@/lib/derived-roads";
import { DerivedMark, markColor } from "./DerivedRoadGrid";

interface AskRoadMarksProps {
  outcomes: Outcome[];
  side: Side;
  /** Mark size in px. */
  size?: number;
  label?: string;
}

export function AskRoadMarks({ outcomes, side, size = 7, label }: AskRoadMarksProps) {
  const ask = useMemo(() => askRoad(outcomes, side), [outcomes, side]);
  return (
    <span
      role="img"
      aria-label={label}
      style={{ display: "inline-flex", alignItems: "center", gap: 1, marginLeft: 1 }}
    >
      {DERIVED_ROAD_KINDS.map((kind) => {
        const mark = ask[kind];
        if (!mark) {
          return (
            <span
              key={kind}
              style={{
                display: "block",
                width: size,
                height: size,
                borderRadius: "50%",
                border: "1px solid #364153",
                boxSizing: "border-box",
              }}
            />
          );
        }
        return (
          <DerivedMark
            key={kind}
            kind={kind}
            color={markColor(mark)}
            size={`${kind === "cockroach" ? size + 1 : size}px`}
          />
        );
      })}
    </span>
  );
}

export default AskRoadMarks;
