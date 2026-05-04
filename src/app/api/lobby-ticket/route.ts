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
// dual-secret verify (F-08 Phase B). We re-verify here (rather than
// trust that the proxy already did) because:
//   1. /api/* routes are NOT in the proxy's `matcher`, so requests to
//      /api/lobby-ticket bypass it entirely; a hostile client could
//      forge a `studio_session` cookie if we didn't check.
//   2. defense in depth: a future proxy refactor can't accidentally
//      expose this route by widening the matcher.
//
// TODO: F-08 burn-down — drop the STUDIO_JWT_SECRET branch after
// ~2026-05-07 (7 days post-deploy).
function loadJwtSecret(envVar: string, fallback: string): Uint8Array {
  const secret = process.env[envVar];
  if (!secret && process.env.NODE_ENV !== "development") {
    throw new Error(
      `${envVar} env var is required in non-development environments`,
    );
  }
  return new TextEncoder().encode(secret || fallback);
}

const STUDIO_JWT_SECRET = loadJwtSecret(
  "STUDIO_JWT_SECRET",
  "playroom-studio-secret-change-in-prod",
);
const ADMIN_JWT_SECRET = loadJwtSecret(
  "ADMIN_JWT_SECRET",
  "playroom-admin-secret-change-in-prod",
);

async function verifyStudioCookie(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, ADMIN_JWT_SECRET);
    return true;
  } catch {
    // Fall through to legacy verifier.
  }
  try {
    await jwtVerify(token, STUDIO_JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

const STUDIO_COOKIE = "studio_session";

interface LobbyTicketBody {
  /** Optional: scope the ticket to a specific table (mirrors backend filter). */
  table_id?: string;
  /**
   * Optional explicit role.
   *   - "demo": bypass cookie auth, mint a firehose (used by /play/demo).
   *   - "player": only consider the player cookie. If absent, return 401.
   *     Prevents a stale top-level studio_session from being consumed
   *     inside a player iframe.
   *   - "studio": only consider the studio cookie. Symmetric for safety.
   *   - omitted: legacy auto-detect (player cookie wins, falls through
   *     to studio). Kept for back-compat; new callers should be explicit.
   */
  role?: "demo" | "player" | "studio";
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
  } else if (body.role === "player") {
    // Strict player path: never fall through to studio cookie. If a
    // stale top-level studio_session is sitting in the same browser
    // it must NOT be consumed inside the player iframe.
    if (!playerToken) {
      return NextResponse.json(
        { error_code: "1001", message: "Missing player session" },
        { status: 401 },
      );
    }
    backendPayload = {
      session_token: playerToken,
      table_id: body.table_id,
    };
  } else if (body.role === "studio") {
    // Strict studio path.
    if (!studioToken || !(await verifyStudioCookie(studioToken))) {
      return NextResponse.json(
        { error_code: "1002", message: "Invalid or expired studio session" },
        { status: 401 },
      );
    }
    backendPayload = {
      role: "studio",
      table_id: body.table_id,
    };
  } else if (playerToken) {
    // Legacy auto-detect (no explicit role): player cookie wins.
    backendPayload = {
      session_token: playerToken,
      table_id: body.table_id,
    };
  } else if (studioToken) {
    const studioOk = await verifyStudioCookie(studioToken);
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
