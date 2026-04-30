import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for POST /internal/bet/void on the backend.
 * Mirrors `/api/bet/route.ts`: pulls the player's session token from the
 * HttpOnly `prg_session` cookie (or `X-Session-Token` header / body
 * fallback for transitional callers) and forwards `{session_token, fight_id}`
 * with the service key so it never reaches the client.
 *
 * Used by the CLEAR BETS pill to refund optimistically-debited bets during
 * the betting window. Backend handles both transfer-mode (atomic SQL) and
 * seamless-mode (per-bet wallet /cancel) wallets.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionToken =
      req.cookies.get(PLAYER_SESSION_COOKIE)?.value ||
      req.headers.get("x-session-token") ||
      body.session_token;

    const res = await fetch(`${API_BASE}/internal/bet/void`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
      },
      body: JSON.stringify({
        session_token: sessionToken,
        fight_id: body.fight_id,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          error_code: "PROXY_ERROR",
          message: data.detail || data.message || data.error || "Void failed",
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
