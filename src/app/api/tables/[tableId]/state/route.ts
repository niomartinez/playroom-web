import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = process.env.API_SERVICE_KEY || "";

/**
 * Proxy for GET /internal/tables/{tableId}/state on the backend.
 * Used on /play and /studio mount to recover the round state after a refresh.
 * Adds the service key so it never reaches the client.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  const { tableId } = await params;
  try {
    const res = await fetch(
      `${API_URL}/internal/tables/${encodeURIComponent(tableId)}/state`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Service-Key": SERVICE_KEY,
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
