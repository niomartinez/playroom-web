import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for POST /internal/stream/rejoin — re-entry hook called on player UI
 * mount. A page load/refresh simulates walking back in from the lobby: the
 * backend clears any idle stream revoke + resets the idle counter, restoring
 * video and betting for the fresh seat.
 *
 * Auth mirrors /api/stream/token: session token from the HttpOnly prg_session
 * cookie, forwarded as X-Session-Token.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionToken =
      req.cookies.get(PLAYER_SESSION_COOKIE)?.value ||
      req.headers.get("x-session-token") ||
      body.session_token;

    if (!sessionToken) {
      return NextResponse.json(
        { error_code: "1002", message: "No session" },
        { status: 401 },
      );
    }

    const res = await fetch(`${API_BASE}/internal/stream/rejoin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
        "X-Session-Token": sessionToken,
      },
      body: JSON.stringify({ game_id: body.game_id }),
    });

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
