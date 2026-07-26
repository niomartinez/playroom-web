"use client";

import { useEffect, useRef, useState } from "react";

/** Post-settlement odometer crawl on the balance number (wins + losses). */
const BALANCE_CRAWL_DURATION_MS = 1500;
/** Quick tick for small balance changes (e.g. placing a chip). */
const BALANCE_CRAWL_FAST_DURATION_MS = 300;
/** Above this delta, we treat the change as "settlement-sized" -> long crawl. */
const BALANCE_CRAWL_FAST_THRESHOLD = 1000;

/**
 * Smoothly animates a `displayed` balance toward the live `target` balance.
 * Uses requestAnimationFrame interpolation. Picks a longer duration for
 * settlement-sized changes (>$1k) and a fast tick for chip-sized changes
 * so individual bet placements feel snappy.
 */
export function useDisplayBalance(target: number): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const durationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const hasInitRef = useRef(false);

  useEffect(() => {
    // First non-zero target: snap, don't animate. The GameContext balance
    // starts at 0 and gets populated by the balance WS later — we don't want
    // a 1.5s odometer crawl from $0 -> balance on initial page load.
    if (!hasInitRef.current && target !== 0) {
      hasInitRef.current = true;
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    // First mount: snap immediately.
    if (display === target && fromRef.current === target) return;

    const delta = Math.abs(target - display);
    const duration =
      delta >= BALANCE_CRAWL_FAST_THRESHOLD
        ? BALANCE_CRAWL_DURATION_MS
        : BALANCE_CRAWL_FAST_DURATION_MS;

    fromRef.current = display;
    startRef.current = performance.now();
    durationRef.current = duration;

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / durationRef.current);
      // ease-out cubic — feels good for an odometer
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
        rafRef.current = null;
      }
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

