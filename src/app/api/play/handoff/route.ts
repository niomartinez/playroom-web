import { NextRequest, NextResponse } from "next/server";
import {
  PLAYER_SESSION_COOKIE,
  PLAYER_SESSION_COOKIE_OPTIONS,
} from "@/lib/player-session";

/**
 * F-10: Player session token handoff.
 *
 * The operator launches the player into our app via:
 *
 *   GET /play?token=<session-token>&game=<id>&lang=<l>&lobbyUrl=<u>...
 *
 * On first hit, the Server Component at /play immediately redirects
 * here (preserving all the launch params except `token`, which moves
 * into the cookie). We:
 *
 *   1. Set an HttpOnly + Secure + SameSite=Lax cookie carrying the
 *      session token (4h max-age, aligned with backend TTL).
 *   2. Redirect (302) to /play with the token query-param stripped,
 *      so the URL the browser actually displays + records in history
 *      no longer leaks the token via Referer or screen-share.
 *
 * Subsequent /play loads read the cookie, never the URL. Demo mode
 * (`/play/demo`) doesn't go through this path.
 *
 * Note: We use `?ret=` to receive the destination (the cleaned-up
 * /play URL with non-token params). Limiting redirects to same-origin
 * paths (must start with "/" + must NOT start with "//") prevents
 * open-redirect abuse.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const ret = searchParams.get("ret") ?? "/play";

  if (!token) {
    console.warn("[play/handoff] missing token in handoff request");
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  // Same-origin guard: must be a path on our app, never a full URL or
  // protocol-relative URL (which the browser resolves cross-origin).
  const safeRet = ret.startsWith("/") && !ret.startsWith("//") ? ret : "/play";

  const dest = new URL(safeRet, req.nextUrl.origin);
  const res = NextResponse.redirect(dest, { status: 302 });
  res.cookies.set(PLAYER_SESSION_COOKIE, token, PLAYER_SESSION_COOKIE_OPTIONS);
  // Belt-and-suspenders: ensure proxies/CDNs never cache a Set-Cookie response.
  res.headers.set("Cache-Control", "no-store");
  return res;
}
