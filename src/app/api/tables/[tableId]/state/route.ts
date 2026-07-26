import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Proxy for GET /internal/tables/{tableId}/state on the backend.
 * Used on /play and /studio mount to recover the round state after a refresh.
 * Adds the service key so it never reaches the client.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  const { tableId } = await params;
  // Forward the player's session so the backend can answer per-session questions
  // (currently idle_exempt). Read from the HttpOnly prg_session cookie rather
  // than a query param — same reason /api/me/active-bets does: a token in the
  // URL leaks into logs and history.
  const playerSession = req.cookies.get("prg_session")?.value;
  try {
    const res = await fetch(
      `${API_URL}/internal/tables/${encodeURIComponent(tableId)}/state`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Service-Key": SERVICE_KEY,
          ...(playerSession ? { "X-Session-Token": playerSession } : {}),
        },
        // Always go to the network — this is live round state, never cache.
        cache: "no-store",
      },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
