import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = process.env.API_SERVICE_KEY || "";

/**
 * Proxy for GET /internal/me/active-bets?fight_id=... on the backend.
 *
 * The player's session token is forwarded via the `X-Session-Token` header.
 * The client sends it as a query param (since it already has it in the URL),
 * and we move it into a header for the backend call so the backend resolves
 * the player_id server-side without ever exposing the player UUID to the
 * client.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const fightId = searchParams.get("fight_id");
  const sessionToken =
    searchParams.get("session_token") || req.headers.get("x-session-token");

  if (!fightId) {
    return NextResponse.json(
      { error_code: "1010", message: "fight_id query param required" },
      { status: 400 },
    );
  }
  if (!sessionToken) {
    return NextResponse.json(
      { error_code: "1002", message: "Missing session token" },
      { status: 401 },
    );
  }

  try {
    const url = new URL(`${API_URL}/internal/me/active-bets`);
    url.searchParams.set("fight_id", fightId);
    const res = await fetch(url.toString(), {
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
