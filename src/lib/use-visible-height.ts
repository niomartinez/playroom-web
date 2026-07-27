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
 * Slack before we call the frame "clipped".
 *
 * Sub-pixel rounding and a scrollbar are not an operator's navigation bar,
 * and treating them as one would swap `100dvh` for a frozen pixel height on
 * every ordinary launch.
 */
const CLIP_TOLERANCE_PX = 8;

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

/**
 * The proportional shrink applied to everything on the mobile layout when the
 * visible band is smaller than the design's natural height.
 *
 * Published as `--prg-scale` (see PlayerLayout) and multiplied into pad
 * heights, chip sizes, paddings and font sizes. Flex-shrinking the CONTAINERS
 * was not enough on its own: the bet pads are laid out in hard pixels, so a
 * shorter panel just clipped them. Everything the player looks at has to get
 * smaller together, or the space comes out of whichever block has no floor.
 */
export const SCALE_VAR = "--prg-scale";

/** Never shrink past this — below it the pads stop being reliably tappable. */
export const MIN_SCALE = 0.62;

export interface VisibleHeight {
  /** Height of the band the player can actually see. Always a number once measured. */
  height: number | null;
  /**
   * True only when our frame really is cut off — an operator's chrome above a
   * frame that runs past the bottom of the screen.
   *
   * The distinction matters because the two cases want different CSS. Clipped
   * needs our measured pixel height, since the browser cannot see the operator's
   * nav. Unclipped wants `100dvh`, which tracks iOS's collapsing URL bar by
   * itself — a pixel height frozen at load goes stale the moment the bar moves,
   * leaving the page short of the screen with a white band under it.
   */
  clipped: boolean;
}

export function useVisibleHeight(): VisibleHeight {
  const [state, setState] = useState<VisibleHeight>({ height: null, clipped: false });
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

      // Are we ACTUALLY clipped, or just being measured? A top-level launch —
      // and a well-sized iframe — is not clipped, and for those a frozen pixel
      // height is strictly worse than `100dvh`.
      //
      // iOS proves it: the visual viewport grows when the URL bar collapses, so
      // a height locked at load (bar expanded) leaves the page short of the
      // screen the moment the player scrolls. That is where the white band
      // under the felt came from, and it is why the document could scroll at
      // all. `100dvh` tracks the URL bar natively; we only need our own number
      // for the one case the browser cannot see — an operator's chrome above a
      // frame that runs off the bottom.
      const clipped = usable && visibleSlice! < own - CLIP_TOLERANCE_PX;
      const next = clipped ? visibleSlice! : null;
      const top = clipped ? Math.min(visibleTop, Math.max(0, own - next!)) : 0;

      const root = document.documentElement;
      // Unclipped resolves the fixed-element insets to zero, so `bottom` lands
      // on the real bottom edge without a stale pixel value in the way.
      root.style.setProperty(CSS_VAR_HEIGHT, clipped ? `${next}px` : "100%");
      root.style.setProperty(CSS_VAR_TOP, `${top}px`);

      // `height` is always the usable number (for the page scale); `clipped`
      // decides whether the container is sized in pixels or left to 100dvh.
      const available = clipped ? visibleSlice! : own;
      setState((prev) =>
        prev.height !== null &&
        Math.abs(prev.height - available) < 2 &&
        prev.clipped === clipped
          ? prev
          : { height: available, clipped },
      );
    };

    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;
          const slice = Math.round(entry.intersectionRect.height);
          // 0 means we're fully scrolled out of view, not that we have no room.
          if (slice <= 0) return;

          // Keep the SMALLEST slice seen since the last baseline, never the
          // latest. The operator's page can scroll, and scrolling reveals more
          // of our frame — so the current intersection climbs toward the full
          // frame height the moment the player drags. Sizing to that is what
          // let the layout report FITS while the info bar sat 35px below the
          // screen: we had measured a scrolled-down moment, not the resting
          // position the player actually starts from. The worst case is the
          // only one worth fitting.
          if (visibleSlice === null || slice < visibleSlice) {
            visibleSlice = slice;
            // The sentinel is pinned at the frame's top, so the gap between the
            // two rects IS how much of us is hidden above the fold — non-zero
            // when the operator's page is scrolled part-way past our top.
            visibleTop = Math.max(
              0,
              Math.round(entry.intersectionRect.top - entry.boundingClientRect.top),
            );
            publish();
          }
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
    // Both RE-BASELINE: the geometry genuinely changed, so the old worst case
    // is stale and holding onto it would leave us sized for a screen that no
    // longer exists (e.g. permanently portrait-sized after a rotate).
    const rebaseline = () => {
      visibleSlice = null;
      visibleTop = 0;
      publish();
    };
    const onResize = () => rebaseline();
    const onOrientation = () => window.setTimeout(rebaseline, 250);
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

  return state;
}

export default useVisibleHeight;

/**
 * The element's own width, measured.
 *
 * Uses a CALLBACK ref, not a `useRef` object. `useIsMobile` starts false, so
 * PlayerLayout renders its desktop branch on the very first pass and the mobile
 * container — the thing we want to measure — does not exist yet. An effect with
 * an empty dep array runs once against `ref.current === null`, bails, and never
 * fires again: the width stayed null forever, the scale pinned at 1, and
 * nothing shrank. A callback ref re-runs the moment the node actually mounts.
 */
export function useElementWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const w = Math.round(node.getBoundingClientRect().width);
      if (w > 0) {
        setWidth((prev) => (prev !== null && Math.abs(prev - w) < 2 ? prev : w));
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    measure();
    return () => ro.disconnect();
  }, [node]);

  return { width, ref: setNode };
}

/** Both dimensions of an element. Callback ref, for the reason above. */
export function useElementSize<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const r = node.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w <= 0 || h <= 0) return;
      setSize((prev) =>
        prev && Math.abs(prev.w - w) < 2 && Math.abs(prev.h - h) < 2 ? prev : { w, h },
      );
    };
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    measure();
    return () => ro.disconnect();
  }, [node]);

  return { size, ref: setNode };
}
