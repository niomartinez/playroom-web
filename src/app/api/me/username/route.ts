import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for POST /internal/me/username on the backend.
 *
 * Mirrors the active-bets proxy: the session token is read from the
 * HttpOnly `prg_session` cookie and forwarded as `X-Session-Token`
 * alongside the `X-Service-Key`.
 *
 * Request:  { username }
 * Success:  { display_name }
 * Failure:  4xx with a 'name taken' / 'invalid' style error — passed
 *           through unchanged so the client can surface the message.
 */
export async function POST(req: NextRequest) {
  const sessionToken =
    req.cookies.get(PLAYER_SESSION_COOKIE)?.value ||
    req.headers.get("x-session-token");

  if (!sessionToken) {
    return NextResponse.json(
      { error_code: "1002", message: "Missing session token" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));

  try {
    const res = await fetch(`${API_URL}/internal/me/username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
        "X-Session-Token": sessionToken,
      },
      body: JSON.stringify({ username: body?.username }),
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
