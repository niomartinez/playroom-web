"use client";

/**
 * Server-declared idle exemption for the current player session.
 *
 * Set from the /api/stream/rejoin response on mount (long-lived tokens —
 * staging test tokens — are fully exempt from idle enforcement server-side).
 * Read by use-idle-kick so the client's warnings/expired overlay stay quiet
 * for sessions the server will never cut anyway.
 *
 * Module-level on purpose: the flag is written by use-stream-token and read
 * by use-idle-kick at count time; a change event lets an already-mounted
 * idle hook pick it up without prop plumbing between unrelated hooks.
 */

let idleExempt = false;

export const IDLE_EXEMPT_EVENT = "playroom:idle-exempt";

export function setIdleExempt(value: boolean): void {
  idleExempt = value;
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(IDLE_EXEMPT_EVENT, { detail: value }));
    } catch {
      // CustomEvent unavailable — readers still see the flag on next check.
    }
  }
}

export function getIdleExempt(): boolean {
  return idleExempt;
}
