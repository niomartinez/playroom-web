import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for GET /internal/me/profile on the backend.
 *
 * Mirrors the active-bets proxy: the session token is read from the
 * HttpOnly `prg_session` cookie (auto-sent on same-origin fetches) and
 * forwarded as `X-Session-Token` alongside the `X-Service-Key`. The
 * `X-Session-Token` header is still honoured as a fallback for non-cookie
 * callers.
 *
 * Backend contract:
 *   { display_name, display_name_set, balance, currency_code }
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

  try {
    const res = await fetch(`${API_URL}/internal/me/profile`, {
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
