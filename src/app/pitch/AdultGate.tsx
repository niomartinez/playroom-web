"use client";

import { useState } from "react";

/**
 * 18+ click-to-reveal overlay, styled per the approved design: near-opaque
 * blurred scrim, Anton red-gradient "18+", mono caption lines. Place as the
 * last child of a position:relative media frame. Fully obscures the media
 * until tapped; `onReveal` fires once (e.g. to start muted video playback).
 */
export default function AdultGate({
  line,
  sub = "adults only",
  large = false,
  onReveal,
}: {
  line: string;
  sub?: string;
  large?: boolean;
  onReveal?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      className={`adult-gate ${large ? "lg" : ""} ${revealed ? "hidden" : ""}`}
      aria-label="Reveal adult product preview, 18 plus"
      onClick={() => {
        setRevealed(true);
        onReveal?.();
      }}
    >
      <span className="g-18 grad-text">18+</span>
      <span className="g-line">{line}</span>
      {sub ? <span className="g-sub">{sub}</span> : null}
    </button>
  );
}
