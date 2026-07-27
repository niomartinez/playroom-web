import { requireEnv } from "@/lib/server-env";
import type { SeatBootstrap, SeatDecision } from "@/lib/seat-status";

/**
 * Server-only: fetch the authoritative seat decision before /play renders.
 *
 * This is what stops the client racing two browser transports to decide a money
 * guard (see the header of `seat-status.ts`). The call is server-to-server
 * inside our own platform — Vercel to Render — so it is not subject to the
 * shields, extensions and third-party-cookie blocking that made the browser's
 * own lookups unreliable in the first place.
 *
 * NEVER THROWS. A rejected promise here would 500 the whole launch page; the
 * failure mode is `{status: "unknown"}`, which the client renders as a
 * non-terminal, NON-BLOCKING "checking your seat" pill and retries out of. It
 * does not hold the table hostage: the server enforces the seat itself.
 *
 * SECURITY: this module MUST NEVER be imported by a "use client" file — the
 * service key (API_SERVICE_KEY) would then be bundled into the browser. Same
 * rule and same enforcement-by-convention as `lib/ocms-server.ts`; the
 * `server-only` package is not a dependency of this repo.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";

/**
 * Caps the launch-path TTFB cost. This is awaited INLINE in the /play Server
 * Component, so every millisecond here is a millisecond added to every single
 * game launch — the most latency-sensitive surface in the product. At 2500ms a
 * slow Render response could nearly triple a launch.
 *
 * 700ms is well clear of the p99 for a healthy server-to-server call inside our
 * own platform, so the common path still gets its authoritative answer at first
 * paint — which is what closed the original race and is why this fetch stays.
 * Anything slower than that is a backend already in trouble, and the right
 * answer there is to launch the table and let `use-seat-status` retry (2s,
 * backing off) rather than make a healthy player wait on a sick server.
 */
const SEAT_FETCH_TIMEOUT_MS = 700;

export async function fetchSeatBootstrap({
  token,
  gameId,
}: {
  token: string | null;
  gameId: string | null;
}): Promise<SeatBootstrap> {
  // No session, demo, or a launch with no table: there is nothing to gate.
  // Do NOT invent a lockout for an already-broken launch shape.
  if (!token || token === "demo" || !gameId) return { status: "skipped" };

  try {
    const res = await fetch(
      `${API_BASE}/internal/me/seat?game_id=${encodeURIComponent(gameId)}`,
      {
        headers: {
          "X-Service-Key": requireEnv("API_SERVICE_KEY", "dev-service-key"),
          "X-Session-Token": token,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(SEAT_FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) return { status: "unknown" };

    const json = (await res.json().catch(() => null)) as {
      error_code?: string;
      data?: { seat?: SeatDecision };
    } | null;
    if (!json) return { status: "unknown" };

    // A blocked player is a 200 with error_code "0" — `blocked` is DATA. An
    // unknown table is the operator launching a game we don't have, which is
    // not a reason to lock anybody out of anything.
    if (json.error_code === "0" && json.data?.seat) {
      const seat = json.data.seat;
      return seat.blocked ? { status: "blocked", seat } : { status: "ok", seat };
    }
    if (json.error_code === "1008") return { status: "skipped" }; // GAME_NOT_FOUND
    return { status: "unknown" };
  } catch {
    // Timeout, DNS, cold start, malformed body — all the same to the caller.
    return { status: "unknown" };
  }
}
