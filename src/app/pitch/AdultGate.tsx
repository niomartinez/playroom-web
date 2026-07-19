"use client";

import { useState } from "react";

/**
 * 18+ click-to-reveal overlay. Place it as the last child of a
 * position:relative media container. Nothing adult is visible until the
 * presenter clicks, which is the right behaviour for a deck that may be
 * opened in public or shared by link. `onReveal` fires once (e.g. to start
 * video playback).
 */
export default function AdultGate({
  label,
  onReveal,
}: {
  label: string;
  onReveal?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      className={`adult-gate ${revealed ? "hidden" : ""}`}
      aria-label="Reveal adult product preview, 18 plus"
      onClick={() => {
        setRevealed(true);
        onReveal?.();
      }}
    >
      <span className="ring">18+</span>
      <span className="g-title">Adults only</span>
      <span className="g-sub">{label} — tap to reveal</span>
    </button>
  );
}
