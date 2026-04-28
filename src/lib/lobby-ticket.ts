/**
 * F-06: Client helper to fetch a short-lived `/ws/lobby` ticket.
 *
 * Replaces the per-tab inlining of `NEXT_PUBLIC_API_KEY` in the WS URL.
 * Every WS connection (including reconnects) calls this first to get a
 * fresh single-use ticket. The previous ticket may already have been
 * consumed (single-use semantics) or expired (5 minute TTL), so we
 * always mint anew rather than caching.
 *
 * F-06 follow-up (S-5): we now distinguish auth failures from network
 * failures so the WS hooks can stop the silent forever-retry loop on
 * an expired session and surface a "please relaunch" cue to the UI.
 *
 *   { ticket }                     — success
 *   { error: "unauthorized" }      — 401 from the proxy: session
 *                                    cookie missing/expired. The WS
 *                                    hook should STOP reconnecting
 *                                    and signal the UI.
 *   { error: "network" }           — anything else (5xx, fetch threw,
 *                                    JSON malformed). Caller keeps
 *                                    its existing exponential backoff.
 */

export type LobbyTicketResult =
  | { ticket: string }
  | { error: "unauthorized" }
  | { error: "network" };

export async function fetchLobbyTicket(
  tableId?: string,
): Promise<LobbyTicketResult> {
  let res: Response;
  try {
    res = await fetch("/api/lobby-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Body is optional — backend treats `table_id: undefined` as
      // "no table scoping". We still POST a JSON body so any future
      // CSRF middleware that requires `Content-Type: application/json`
      // doesn't reject the request.
      body: JSON.stringify(tableId ? { table_id: tableId } : {}),
      // Same-origin: cookie is sent automatically.
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { error: "network" };
  }

  if (res.status === 401) {
    // Session cookie missing/expired. Distinct from a 5xx because the
    // user has to take action (relaunch from the operator) — retrying
    // every 30s forever would never recover.
    return { error: "unauthorized" };
  }

  if (!res.ok) {
    return { error: "network" };
  }

  try {
    const data = (await res.json()) as { ticket?: string };
    if (typeof data.ticket === "string" && data.ticket.length > 0) {
      return { ticket: data.ticket };
    }
    return { error: "network" };
  } catch {
    return { error: "network" };
  }
}

/**
 * Fire the session-expired signal exactly once per page lifetime.
 *
 * Two channels (best of both):
 *   1. `window.postMessage` to the parent iframe via the existing
 *      `iframe-bridge.ts` helper, using the standard
 *      `gameError` event with `code: "SESSION_EXPIRED"` (matches the
 *      "Standard events" comment in iframe-bridge.ts) — so an
 *      operator wrapping us in an iframe can react.
 *   2. A `CustomEvent("playroom:session-expired")` on `window` so any
 *      in-app component (GameWrapper, studio header banner, …) can
 *      listen without depending on the iframe path being live.
 *
 * Idempotent: if both `use-lobby-ws` and `use-studio-ws` happen to
 * detect the 401 in parallel we still only signal once.
 */
let sessionExpiredFired = false;

export function signalSessionExpired(): void {
  if (typeof window === "undefined") return;
  if (sessionExpiredFired) return;
  sessionExpiredFired = true;

  // Lazy import so this module stays tree-shake-friendly for any
  // caller that only wants the fetch helper.
  void import("./iframe-bridge").then(({ sendToParent }) => {
    sendToParent("gameError", { code: "SESSION_EXPIRED" });
  });

  try {
    window.dispatchEvent(new CustomEvent("playroom:session-expired"));
  } catch {
    // CustomEvent unavailable in an exotic runtime — postMessage
    // already fired above, that's the operator-facing signal.
  }
}
