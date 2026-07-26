"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/game-context";
import { useCountdown } from "@/lib/use-countdown";

/**
 * #1 — Betting countdown, pinned to the bottom-right OF THE VIDEO IMAGE.
 *
 * Non-interactive (`pointer-events: none`) so it never blocks the video or
 * any control beneath it, and fades out the instant betting closes. A thin
 * ring depletes alongside the number; both go red for the final 5 seconds.
 *
 * Rendered inside a `position: relative` video container (see PlayerLayout).
 *
 * Positioning note: the <video> is `object-contain` (VideoPlayer), so whenever
 * the stream's aspect ratio differs from its container the picture is letter-
 * or pillar-boxed and the container's corners are DEAD BARS, not video. Pinning
 * to the container therefore parked the dial on the felt beside the picture.
 * We measure the real displayed image instead — see useVideoBox.
 */

/** Inset (px) of the video's displayed image inside its container.
 *
 *  Mirrors what `object-fit: contain` does: scale by the smaller of the two
 *  ratios, then centre, leaving equal bars on the two overflowing sides. Zero
 *  on every side while the intrinsic size is still unknown, which degrades to
 *  the container corner — the previous behaviour — rather than mispositioning.
 */
function useVideoBox(ref: React.RefObject<HTMLDivElement | null>) {
  const [inset, setInset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // The <video> is a sibling inside the same positioned container, and
    // VideoPlayer always renders it (even before a stream URL exists) so this
    // lookup is stable rather than racing the WHEP/HLS handshake.
    const video = host.parentElement?.querySelector("video") ?? null;

    const measure = () => {
      const box = host.getBoundingClientRect();
      const vw = video?.videoWidth ?? 0;
      const vh = video?.videoHeight ?? 0;
      if (!vw || !vh || !box.width || !box.height) {
        setInset((p) => (p.x === 0 && p.y === 0 ? p : { x: 0, y: 0 }));
        return;
      }
      const scale = Math.min(box.width / vw, box.height / vh);
      const x = Math.max(0, (box.width - vw * scale) / 2);
      const y = Math.max(0, (box.height - vh * scale) / 2);
      setInset((p) =>
        Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5 ? p : { x, y },
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    if (video) {
      // Intrinsic size is unknown until metadata lands, and `resize` fires if
      // the studio ever changes resolution mid-stream.
      video.addEventListener("loadedmetadata", measure);
      video.addEventListener("resize", measure);
    }
    return () => {
      ro.disconnect();
      video?.removeEventListener("loadedmetadata", measure);
      video?.removeEventListener("resize", measure);
    };
  }, [ref]);

  return inset;
}

export default function RoundCountdown() {
  const { roundStatus, currentRound } = useGame();
  const remaining = useCountdown();
  const total = currentRound?.countdown ?? 15;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoInset = useVideoBox(hostRef);

  const show = roundStatus === "betting_open" && remaining !== null && remaining > 0;
  const urgent = remaining !== null && remaining <= 5;

  const R = 45;
  const CIRC = 2 * Math.PI * R;
  const frac = total > 0 ? Math.max(0, Math.min(1, (remaining ?? 0) / total)) : 0;

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        // Spans the whole container so it can measure the displayed image; the
        // dial is then pushed in by the letter/pillar-box bars below.
        position: "absolute",
        inset: 0,
        display: "flex",
        // Bottom-right instead of centred: dead-centre put the dial squarely
        // over the dealer and the cards being dealt.
        alignItems: "flex-end",
        justifyContent: "flex-end",
        // The bars are the gap between the container edge and the picture edge,
        // so adding them to the padding lands the dial inside the VIDEO's
        // bottom-right corner rather than the container's.
        paddingRight: `calc(${videoInset.x}px + clamp(8px, 1.8vw, 20px))`,
        paddingBottom: `calc(${videoInset.y}px + clamp(8px, 1.8vw, 20px))`,
        pointerEvents: "none",
        opacity: show ? 1 : 0,
        transition: "opacity 0.4s ease",
        zIndex: 15,
      }}
    >
      <div
        style={{
          position: "relative",
          // Smaller than the old centrepiece — it no longer needs to read from
          // across the table, just from the corner.
          width: "min(18vw, 13vh)",
          minWidth: 66,
          maxWidth: 132,
          aspectRatio: "1 / 1",
        }}
      >
        {/* A dark disc behind the dial: at corner size the number has to stay
            legible over whatever the camera happens to be showing (bright felt,
            a dealer's white shirt), which the old low-opacity centre treatment
            no longer guarantees. */}
        <div
          style={{
            position: "absolute",
            inset: "6%",
            borderRadius: "50%",
            background: "rgba(3,7,18,0.46)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
        />
        <svg
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}
        >
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={5} />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={urgent ? "rgba(251,44,54,0.9)" : "rgba(255,255,255,0.78)"}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - frac)}
            style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.3s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            lineHeight: 1,
            fontSize: "clamp(24px, 6.4vh, 56px)",
            fontVariantNumeric: "tabular-nums",
            color: urgent ? "rgba(255,92,100,0.98)" : "rgba(255,255,255,0.95)",
            textShadow: "0 2px 12px rgba(0,0,0,0.85)",
          }}
        >
          {remaining ?? ""}
        </div>
      </div>
    </div>
  );
}
