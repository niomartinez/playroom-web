/**
 * Where "Return to lobby" actually sends the player.
 *
 * The blocking modals (idle-expired, minimum-seat-balance) each offer exactly
 * one action, so that action has to land somewhere useful. It used to end the
 * session instead: with no `lobbyUrl` on the launch, the ladder fell through to
 * `postMessage("closeGame")`, the operator's wrapper answered that with
 * `window.close()`, and the tab vanished. The game is launched into a NEW tab
 * from the operator's own tab, so closing it doesn't reveal a lobby underneath
 * — it drops the player out of the product entirely.
 *
 * So we work out the operator's site ourselves. Nothing here is hardcoded to
 * any operator; every signal is read off the live embedding at runtime, which
 * is what makes one build correct for GameSpot, Time2bet and whoever is next.
 *
 * Priority:
 *   1. `lobbyUrl` — the explicit return URL from the launch query. If an
 *      operator tells us where to send players back to, that wins outright,
 *      and we honour the full URL (path and all).
 *   2. `location.ancestorOrigins` — the frame chain, outermost last. For a
 *      cross-origin embed this is the one signal that survives any referrer
 *      policy, and WebKit/Blink both ship it, which covers every iPhone.
 *   3. `document.referrer` — the page that embedded or linked us. Only the
 *      ORIGIN is used, for the same reason as below.
 *
 * 2 and 3 deliberately reduce to the bare origin (`https://operator.example`)
 * rather than the full embedding URL. The page that embedded us IS the game
 * page: navigating back to it re-launches the game, and a player who was
 * blocked on balance is blocked again on arrival — a loop, not an exit. The
 * origin root is the operator's own front door.
 */

/** The launch-time origin of our own app, for excluding self-referrals. */
function ownOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * The URL to send the player to, or `null` when nothing can be worked out
 * (direct/QA launch, or an embed that stripped both signals).
 */
export function resolveReturnUrl(lobbyUrl?: string | null): string | null {
  if (typeof window === "undefined") return null;

  // 1. Explicit operator return URL. Validate it parses as http(s) so a
  //    malformed launch param can't turn into a javascript: navigation.
  if (lobbyUrl && originOf(lobbyUrl)) return lobbyUrl;

  const self = ownOrigin();

  // 2. Ancestor frame origins, outermost last. Skip any that are our own
  //    origin (our /play page nested in our own wrapper) and the opaque
  //    "null" a sandboxed ancestor reports.
  try {
    const chain = window.location.ancestorOrigins;
    if (chain && chain.length > 0) {
      for (let i = chain.length - 1; i >= 0; i--) {
        const o = chain[i];
        if (o && o !== "null" && o !== self && originOf(o)) return o;
      }
    }
  } catch {
    // Property is absent on Firefox — fall through to the referrer.
  }

  // 3. Referrer origin. Empty under a `no-referrer` policy, and equal to our
  //    own origin on an internal navigation; both mean "no signal".
  const ref = document.referrer ? originOf(document.referrer) : null;
  if (ref && ref !== self) return ref;

  return null;
}

/** True when we are rendered inside a frame we did not create. */
export function isEmbedded(): boolean {
  return typeof window !== "undefined" && window.self !== window.top;
}

/**
 * Send the player back to the operator's site.
 *
 * Navigates the TOP frame when embedded, so the operator's own chrome goes with
 * us rather than leaving their header wrapped around their lobby. Top-frame
 * navigation from a cross-origin iframe is permitted with transient user
 * activation — call this straight out of a click handler, never from a timer.
 * A sandboxed embed without `allow-top-navigation*` throws, and we fall back to
 * navigating our own frame.
 *
 * Returns false when there was nowhere to go, so the caller can apply its own
 * last resort.
 */
export function returnToLobby(lobbyUrl?: string | null): boolean {
  if (typeof window === "undefined") return false;
  const target = resolveReturnUrl(lobbyUrl);
  if (!target) return false;

  if (isEmbedded()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      window.top!.location.href = target;
      return true;
    } catch {
      // Sandboxed without top-navigation — fall through and take our own frame.
    }
  }
  window.location.href = target;
  return true;
}
