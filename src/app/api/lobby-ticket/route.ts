import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { requireEnv } from "@/lib/server-env";
import { PLAYER_SESSION_COOKIE } from "@/lib/player-session";

/**
 * F-06: Lobby ticket proxy.
 *
 * Replaces the long-lived operator API key (`NEXT_PUBLIC_API_KEY`) that
 * used to be inlined into the browser bundle and used to auth `/ws/lobby`.
 *
 * Now: the browser POSTs here, we authenticate the caller server-side
 * (player via `prg_session` cookie, studio via `studio_session` cookie),
 * forward to the backend with `X-Service-Key`, and return the opaque
 * 5-minute single-use ticket the client uses to open the WS.
 *
 * The ticket value never touches `NEXT_PUBLIC_*`, so it is not visible
 * to other tabs / extensions / cached static bundles.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

// Studio cookie verification mirrors `src/proxy.ts` — same cookie name,
// same JWT secret. We re-verify here (rather than trust that the proxy
// already did) because:
//   1. /api/* routes are NOT in the proxy's `matcher`, so requests to
//      /api/lobby-ticket bypass it entirely; a hostile client could
//      forge a `studio_session` cookie if we didn't check.
//   2. defense in depth: a future proxy refactor can't accidentally
//      expose this route by widening the matcher.
const STUDIO_JWT_SECRET = (() => {
  const secret = process.env.STUDIO_JWT_SECRET;
  if (!secret && process.env.NODE_ENV !== "development") {
    throw new Error(
      "STUDIO_JWT_SECRET env var is required in non-development environments",
    );
  }
  return new TextEncoder().encode(
    secret || "playroom-studio-secret-change-in-prod",
  );
})();

const STUDIO_COOKIE = "studio_session";

interface LobbyTicketBody {
  /** Optional: scope the ticket to a specific table (mirrors backend filter). */
  table_id?: string;
  /**
   * Optional: explicit role. Today only "demo" is recognized — it
   * bypasses the cookie auth check so /play/demo (which has no session
   * cookie) can still mint a firehose ticket. Player + studio paths are
   * inferred from cookies and ignore this field.
   */
  role?: "demo";
}

export async function POST(req: NextRequest) {
  let body: LobbyTicketBody = {};
  try {
    body = (await req.json()) as LobbyTicketBody;
  } catch {
    // Body is optional — empty POST is fine.
    body = {};
  }

  const playerToken = req.cookies.get(PLAYER_SESSION_COOKIE)?.value;
  const studioToken = req.cookies.get(STUDIO_COOKIE)?.value;

  // Build the backend payload based on which cookie is present. Player
  // takes precedence so a logged-in studio user who also has a player
  // cookie (rare, but possible during dev) gets a player-scoped ticket
  // tied to their actual operator rather than the firehose.
  let backendPayload: Record<string, unknown>;

  if (body.role === "demo") {
    // Demo mode (/play/demo) — no session cookie. Mint a firehose
    // ticket with no operator scoping so the demo UI receives all
    // table events. This is intentionally unauthenticated; the
    // resulting ticket only grants read access to the lobby WS firehose
    // (no betting, no balance access).
    backendPayload = {
      role: "studio",
      table_id: body.table_id,
    };
  } else if (playerToken) {
    backendPayload = {
      session_token: playerToken,
      table_id: body.table_id,
    };
  } else if (studioToken) {
    // Verify the studio cookie before forwarding. If the JWT is invalid
    // or expired, fall through to the 401 below.
    let studioOk = false;
    try {
      await jwtVerify(studioToken, STUDIO_JWT_SECRET);
      studioOk = true;
    } catch {
      studioOk = false;
    }
    if (!studioOk) {
      return NextResponse.json(
        { error_code: "1002", message: "Invalid or expired studio session" },
        { status: 401 },
      );
    }
    backendPayload = {
      role: "studio",
      table_id: body.table_id,
    };
  } else {
    return NextResponse.json(
      { error_code: "1001", message: "Missing player or studio session" },
      { status: 401 },
    );
  }

  try {
    const res = await fetch(`${API_BASE}/internal/lobby/ticket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
      },
      body: JSON.stringify(backendPayload),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        {
          error_code: data.error_code || "PROXY_ERROR",
          message:
            data.message || data.detail || data.error || "Ticket mint failed",
        },
        { status: res.status },
      );
    }

    // Backend wraps as BaseResponse: { error_code, message, data: {ticket, expires_in_seconds} }
    const ticketData = (data?.data ?? {}) as {
      ticket?: string;
      expires_in_seconds?: number;
    };
    if (!ticketData.ticket) {
      return NextResponse.json(
        { error_code: "5000", message: "Backend returned no ticket" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ticket: ticketData.ticket,
        expires_in_seconds: ticketData.expires_in_seconds ?? 300,
      },
      {
        // Tickets are short-lived + single-use; never cache them at the
        // edge or in a service worker.
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
