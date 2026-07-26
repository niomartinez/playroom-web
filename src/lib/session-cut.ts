"use client";

import { useEffect, useState } from "react";

/**
 * "This session's seat was released — stop the video."
 *
 * A latched flag plus an event, deliberately module-level rather than React
 * state, because the producer (the idle hook) and the consumer (VideoPlayer)
 * are unrelated components with no shared ancestor holding this.
 *
 * The LATCH is the important part. An event alone loses the signal to a race:
 * if the seat is released before VideoPlayer's connection effect has registered
 * its listener — or between two runs of that effect while it reconnects — the
 * order is dispatched into nothing and the picture keeps playing behind the
 * "Seat Released" dialog. Since that dialog is a DOM node anyone can delete in
 * devtools, a missed stop is a freeloading hole, not a cosmetic glitch. So a
 * late listener asks {@link isSessionCut} on mount and stops immediately.
 *
 * One-way on purpose: nothing here clears the latch. Re-entry is a page load
 * (the player refreshes, `/stream/rejoin` clears the server revoke), which
 * reloads this module with a fresh `false`.
 */

let cut = false;

export const SESSION_CUT_EVENT = "playroom:stop-video";

/** Latch the cut and tell any live listener. Idempotent. */
export function markSessionCut(): void {
  if (cut) return;
  cut = true;
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(SESSION_CUT_EVENT));
    } catch {
      // CustomEvent unavailable — a listener still sees the latch on mount.
    }
  }
}

/** True once the seat has been released for this page lifetime. */
export function isSessionCut(): boolean {
  return cut;
}

/**
 * React view of the latch, for components that must go inert once the seat is
 * released.
 *
 * Betting has to be disabled in COMPONENT STATE, not merely covered: the "Seat
 * Released" dialog is a DOM node, and deleting it in devtools left the bet pads
 * live and clickable. Those bets were correctly refused by the server, but a
 * player should not be able to reach a bet button at all after losing the seat —
 * and a stream of rejected requests is noise nobody needs.
 */
export function useSessionCut(): boolean {
  const [isCut, setIsCut] = useState<boolean>(() => isSessionCut());
  useEffect(() => {
    // The latch may have flipped between render and effect.
    if (isSessionCut()) setIsCut(true);
    const onCut = () => setIsCut(true);
    window.addEventListener(SESSION_CUT_EVENT, onCut);
    return () => window.removeEventListener(SESSION_CUT_EVENT, onCut);
  }, []);
  return isCut;
}
