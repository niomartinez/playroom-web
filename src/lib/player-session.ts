/**
 * F-10: Player session cookie helpers.
 *
 * The player session token used to live in `?token=...` on every page
 * load — leaking via Referer headers, browser history, screen-share
 * recordings, and server-side request logs.
 *
 * Now: the token is read from the URL exactly ONCE on first load,
 * stashed in an HttpOnly + Secure + SameSite=Lax cookie, and the URL
 * is rewritten without the token so subsequent navigations don't
 * leak it.
 *
 * The cookie max-age is aligned with the backend's 4h TTL (F-10).
 * Sliding refresh on the backend extends `expires_at` server-side,
 * but we don't bump the cookie max-age on the client — the cookie
 * is just a transport. If a refreshed token is still valid past the
 * cookie expiry, the player can re-launch via the operator lobby.
 */

export const PLAYER_SESSION_COOKIE = "prg_session";

/** 4 hours in seconds — aligned with backend DEFAULT_PLAYER_TTL_HOURS. */
export const PLAYER_SESSION_MAX_AGE_SECONDS = 4 * 60 * 60;

/**
 * Cookie attributes shared between the handoff Route Handler (set) and
 * any future logout/clear path.
 *
 * - httpOnly: client JS can't read it — defense vs XSS exfil.
 * - secure: HTTPS only — staging + prod both run behind Cloudflare TLS.
 * - sameSite "lax": allows top-level iframe load + normal navigation,
 *   blocks cross-site POSTs (CSRF). The OCMS iframe is same-origin to
 *   our app domain when launched via /play, so this is fine.
 * - path "/": cookie is needed by every player-side route + API proxy.
 */
export const PLAYER_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: PLAYER_SESSION_MAX_AGE_SECONDS,
};
