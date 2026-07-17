import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for GET /internal/me/bet-history (#10). Forwards the player's session
 * token from the `prg_session` cookie as `X-Session-Token`, plus an optional
 * `limit` query param.
 */
export async function GET(req: NextRequest) {
  const sessionToken =
    req.cookies.get(PLAYER_SESSION_COOKIE)?.value ||
    req.headers.get("x-session-token");

  if (!sessionToken) {
    return NextResponse.json(
      { error_code: "1002", message: "Missing session token" },
      { status: 401 },
    );
  }

  const limit = req.nextUrl.searchParams.get("limit");
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";

  try {
    const res = await fetch(`${API_URL}/internal/me/bet-history${qs}`, {
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
