/**
 * Cookieless-mode transport for the player session token.
 *
 * Normally the token rides in the HttpOnly `prg_session` cookie and every
 * `/api/*` proxy route reads it off the request. Inside an operator's
 * cross-site iframe that cookie is a THIRD-PARTY cookie, and WebKit (all
 * iOS browsers + desktop Safari) refuses to store it — see the comment in
 * `src/app/play/page.tsx` for the full launch flow.
 *
 * When `/play` detects that the cookie did not stick, it hands the token to
 * the client instead and calls this once. We patch `window.fetch` so every
 * same-origin `/api/*` request carries `X-Session-Token`, which each proxy
 * route already honours as a fallback. Nothing else in the app has to know
 * which transport is in play.
 *
 * Patching fetch (rather than threading a header through ~15 call sites)
 * is deliberate: it covers call sites that don't exist yet, so a new player
 * API route can't silently break the Safari path.
 */

let installedToken: string | null = null;

/** True once a cookieless token is active — exported for debugging/tests. */
export function isCookielessSession(): boolean {
  return installedToken !== null;
}

export function installSessionTokenHeader(token: string): void {
  if (typeof window === "undefined") return;
  // Re-installing with the same token is a no-op; a NEW token just updates
  // the value the existing wrapper closes over (never stack wrappers).
  if (installedToken !== null) {
    installedToken = token;
    return;
  }
  installedToken = token;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const current = installedToken;
    if (!current) return nativeFetch(input, init);

    // Resolve the target path without throwing on relative URLs.
    let url: URL;
    try {
      url =
        typeof input === "string"
          ? new URL(input, window.location.href)
          : input instanceof URL
            ? input
            : new URL(input.url, window.location.href);
    } catch {
      return nativeFetch(input, init);
    }

    // Only our own API proxy — never leak the token to a third-party host
    // (the video CDN, an operator asset, an analytics beacon).
    const sameOrigin = url.origin === window.location.origin;
    if (!sameOrigin || !url.pathname.startsWith("/api/")) {
      return nativeFetch(input, init);
    }

    // A Request object carries its own headers; rebuild it so we don't
    // mutate the caller's instance.
    if (input instanceof Request && !init) {
      const req = new Request(input);
      if (!req.headers.has("x-session-token")) {
        req.headers.set("x-session-token", current);
      }
      return nativeFetch(req);
    }

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has("x-session-token")) {
      headers.set("x-session-token", current);
    }
    return nativeFetch(input, { ...init, headers });
  };
}
