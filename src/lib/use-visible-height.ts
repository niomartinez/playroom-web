"use client";

import { useEffect, useRef, useState } from "react";

/**
 * How many CSS pixels of our page are actually on screen.
 *
 * The mobile layout is built to fit without scrolling, and it sized itself to
 * its own viewport. That is the wrong number when we are an iframe on someone
 * else's site: the operator renders their own navigation above us, and the
 * phone renders its URL bar and toolbar above and below THAT. Our frame is
 * handed a height that runs off the bottom of the screen, we fill it honestly,
 * and the player ends up scrolling to reach the bet pads — the exact thing the
 * no-scroll layout was for.
 *
 * Two measurements, and we take the smaller:
 *
 *   1. `visualViewport.height` — our own frame's viewport. On a top-level
 *      mobile page this already tracks the browser's collapsing URL bar, which
 *      `100vh` does not.
 *   2. The height of our frame that the TOP-LEVEL viewport actually shows.
 *      IntersectionObserver with a null root measures against the top-level
 *      viewport even from a cross-origin iframe — the one signal that can see
 *      the operator's chrome, which is otherwise invisible to us. A sentinel
 *      pinned across our viewport reports back the visible slice.
 *
 * Measured at rest — on mount, and on resize/orientation change. Deliberately
 * NOT on scroll: the visible slice shrinks while the operator's page is being
 * scrolled, and re-flowing the whole table under the player's thumb would be
 * worse than the overflow this exists to prevent.
 */

/** Below this we assume a bad measurement rather than a tiny screen. */
const MIN_SANE_HEIGHT = 380;

/**
 * The measurement is also published on `<html>` as CSS custom properties, so
 * `position: fixed` elements can be corrected without threading React state
 * through every overlay.
 *
 * They need it more than the flow layout does. `fixed` resolves against OUR
 * frame's viewport, not the screen — so a bar pinned to `bottom: 0` pins to the
 * bottom of the iframe, which is exactly the part hanging off the phone. The
 * bottom info strip was rendering below the fold, unreachable, and the blocking
 * modals were centring on the frame rather than on what the player can see.
 *
 *   --prg-vh   height of the visible band
 *   --prg-vtop distance from our frame's top down to where it starts
 *
 * Both fall back to the full frame, so any rule using them is correct when
 * nothing is clipped and when the hook has not measured yet.
 */
const CSS_VAR_HEIGHT = "--prg-vh";
const CSS_VAR_TOP = "--prg-vtop";

function ownViewportHeight(): number {
  if (typeof window === "undefined") return 0;
  return Math.round(window.visualViewport?.height ?? window.innerHeight ?? 0);
}

/**
 * Distance from the BOTTOM of our frame up to the bottom of the visible band —
 * i.e. what a `position: fixed` element must offset by to sit on the real
 * bottom edge of the screen instead of the iframe's.
 *
 * `0px` whenever nothing is clipped, so it is safe to apply unconditionally.
 */
export const VISIBLE_BOTTOM_INSET =
  `calc(100% - var(${CSS_VAR_TOP}, 0px) - var(${CSS_VAR_HEIGHT}, 100%))`;

/** Top of the visible band, for overlays that would otherwise use `top: 0`. */
export const VISIBLE_TOP_INSET = `var(${CSS_VAR_TOP}, 0px)`;

/**
 * Drop-in replacement for `inset: 0` on a fixed full-screen overlay: covers the
 * part of our frame the player can actually see, so a centred dialog centres on
 * their screen rather than on the half of the iframe hanging off it.
 */
export const visibleOverlayInset = {
  top: VISIBLE_TOP_INSET,
  bottom: VISIBLE_BOTTOM_INSET,
  left: 0,
  right: 0,
} as const;

export function useVisibleHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // A zero-width strip spanning our viewport top-to-bottom. Zero width and
    // `pointer-events: none` keep it inert; it exists only to be measured.
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    Object.assign(sentinel.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "1px",
      height: "100%",
      pointerEvents: "none",
      opacity: "0",
      zIndex: "-1",
    } as CSSStyleDeclaration);
    document.body.appendChild(sentinel);
    sentinelRef.current = sentinel;

    let visibleSlice: number | null = null;
    let visibleTop = 0;

    const publish = () => {
      const own = ownViewportHeight();
      if (own <= 0) return;
      const usable = visibleSlice !== null && visibleSlice >= MIN_SANE_HEIGHT;
      const next = usable ? Math.min(own, visibleSlice!) : own;
      const top = usable ? Math.min(visibleTop, Math.max(0, own - next)) : 0;

      const root = document.documentElement;
      root.style.setProperty(CSS_VAR_HEIGHT, `${next}px`);
      root.style.setProperty(CSS_VAR_TOP, `${top}px`);

      setHeight((prev) => (prev !== null && Math.abs(prev - next) < 2 ? prev : next));
    };

    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          const slice = Math.round(entry.intersectionRect.height);
          // 0 means we're fully scrolled out of view, not that we have no room.
          if (slice > 0) {
            visibleSlice = slice;
            // The sentinel is pinned at the frame's top, so the gap between the
            // two rects IS how much of us is hidden above the fold — non-zero
            // when the operator's page is scrolled part-way past our top.
            visibleTop = Math.max(
              0,
              Math.round(entry.intersectionRect.top - entry.boundingClientRect.top),
            );
          }
          publish();
        },
        // A fine threshold list makes the observer re-report as the clipped
        // fraction changes, instead of only at fully-in/fully-out.
        { threshold: [0, 0.25, 0.5, 0.75, 0.9, 0.99, 1] },
      );
      observer.observe(sentinel);
    } catch {
      // No IntersectionObserver — own viewport is the best we have.
    }

    publish();

    // Re-measure at rest. `visualViewport` resize fires for the URL bar
    // collapsing; `orientationchange` needs a tick for the new metrics to land.
    const onResize = () => publish();
    const onOrientation = () => window.setTimeout(publish, 250);
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientation);

    return () => {
      observer?.disconnect();
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientation);
      sentinel.remove();
      sentinelRef.current = null;
      document.documentElement.style.removeProperty(CSS_VAR_HEIGHT);
      document.documentElement.style.removeProperty(CSS_VAR_TOP);
    };
  }, []);

  return height;
}

export default useVisibleHeight;
