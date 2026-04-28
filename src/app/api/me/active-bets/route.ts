import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for GET /internal/me/active-bets?fight_id=... on the backend.
 *
 * F-10 follow-up: we no longer accept `session_token` in the query string.
 * The token is read from the HttpOnly `prg_session` cookie (automatically
 * sent on same-origin fetches) — this prevents the token from leaking via
 * Vercel/CF logs, browser history, or a user copying the URL out of devtools.
 * `X-Session-Token` is still accepted as a fallback so non-cookie callers
 * (e.g. transitional clients) keep working.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const fightId = searchParams.get("fight_id");
  const sessionToken =
    req.cookies.get(PLAYER_SESSION_COOKIE)?.value ||
    req.headers.get("x-session-token");

  if (!fightId) {
    return NextResponse.json(
      { error_code: "1010", message: "fight_id query param required" },
      { status: 400 },
    );
  }
  if (!sessionToken) {
    return NextResponse.json(
      { error_code: "1002", message: "Missing session token" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(`${API_URL}/internal/me/active-bets`);
    url.searchParams.set("fight_id", fightId);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
        "X-Session-Token": sessionToken,
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
