import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for GET /internal/me/seat — the authoritative seat decision.
 *
 * The /play Server Component already fetches this once (see lib/seat-server.ts);
 * this route is the CLIENT's way back to the same answer when that first call
 * timed out, and to re-sync `seated` after the player's first bet lands.
 *
 * Auth mirrors /api/stream/rejoin: the session token from the HttpOnly
 * prg_session cookie, falling back to the `x-session-token` header so
 * cookieless (WebKit) launches keep working via installSessionTokenHeader.
 */
export async function GET(req: NextRequest) {
  try {
    const sessionToken =
      req.cookies.get(PLAYER_SESSION_COOKIE)?.value ||
      req.headers.get("x-session-token");

    if (!sessionToken) {
      return NextResponse.json(
        { error_code: "1002", message: "No session" },
        { status: 401 },
      );
    }

    const gameId = req.nextUrl.searchParams.get("game_id") ?? "";
    const res = await fetch(
      `${API_BASE}/internal/me/seat?game_id=${encodeURIComponent(gameId)}`,
      {
        headers: {
          "X-Service-Key": SERVICE_KEY,
          "X-Session-Token": sessionToken,
        },
        cache: "no-store",
      },
    );

    const rawBody = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // Upstream HTML error page — surface nothing sensitive.
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error_code: "PROXY_ERROR",
          message:
            (typeof data.message === "string" && data.message) ||
            `Backend ${res.status}`,
          backend_status: res.status,
        },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
