import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for POST /internal/bet/move on the backend (#2 drag-to-move).
 * Mirrors `/api/bet/void/route.ts` for auth: the player's session token comes
 * from the HttpOnly `prg_session` cookie so it never reaches the client.
 *
 * One call, deliberately. This replaced a client-side void-then-place pair
 * whose gap could leave a player double-debited (a void that found nothing
 * reported success, so the client placed the target and the original bet then
 * landed) or with no bet at all (source voided, replacement rejected).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionToken =
      req.cookies.get(PLAYER_SESSION_COOKIE)?.value ||
      req.headers.get("x-session-token") ||
      body.session_token;

    const res = await fetch(`${API_BASE}/internal/bet/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
      },
      body: JSON.stringify({
        session_token: sessionToken,
        fight_id: body.fight_id,
        from_code: body.from_code,
        to_code: body.to_code,
      }),
    });

    const rawBody = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // Upstream HTML error page (Render/Cloudflare) — surface the raw text.
    }

    if (!res.ok) {
      console.error(
        "[/api/bet/move] backend non-OK",
        res.status,
        rawBody.slice(0, 500),
      );
      return NextResponse.json(
        {
          error_code: "PROXY_ERROR",
          message:
            (typeof data.message === "string" && data.message) ||
            (typeof data.error === "string" && data.error) ||
            (typeof data.detail === "string" && data.detail) ||
            (Array.isArray(data.detail) ? JSON.stringify(data.detail) : null) ||
            `Backend ${res.status}: ${rawBody.slice(0, 200) || "(empty body)"}`,
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
