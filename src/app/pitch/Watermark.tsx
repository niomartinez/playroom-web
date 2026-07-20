"use client";

import { useEffect, useState } from "react";

/**
 * Anti-distribution watermark. A faint tiled overlay plus a corner tag,
 * both stamped with the operator's name and the view timestamp. The
 * `operator` prop comes from the VERIFIED signed link token (see
 * pitch/page.tsx), so a recipient can't edit or strip it via the URL.
 */
export default function Watermark({ operator }: { operator: string }) {
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    // Rendered after mount so server and client markup match.
    setStamp(
      new Date().toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    );
  }, []);

  const label = `Playroom · ${operator}`;
  const tiles = Array.from({ length: 60 });

  return (
    <>
      <div className="watermark" aria-hidden="true">
        {tiles.map((_, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="watermark-tag">
        Confidential · <b>{operator}</b>
        {stamp ? ` · ${stamp}` : ""} · Do not distribute
      </div>
    </>
  );
}
