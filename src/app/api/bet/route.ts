import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for POST /internal/bet on the backend.
 * Adds the service key so it never reaches the client.
 *
 * F-10 follow-up: the player's session token is taken from the HttpOnly
 * `prg_session` cookie, not from the request body. Falls back to
 * `X-Session-Token` header for transitional non-cookie callers. We keep
 * forwarding the token to the backend in the JSON body because that's
 * the wire shape /internal/bet expects.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionToken =
      req.cookies.get(PLAYER_SESSION_COOKIE)?.value ||
      req.headers.get("x-session-token") ||
      body.session_token;

    const res = await fetch(`${API_BASE}/internal/bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
      },
      body: JSON.stringify({
        session_token: sessionToken,
        fight_id: body.fight_id,
        bet_code: body.bet_code,
        bet_amount: body.bet_amount,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          error_code: "PROXY_ERROR",
          message: data.detail || data.message || data.error || "Bet failed",
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
