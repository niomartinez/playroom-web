import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Studio per-card display preview — broadcast-only, no DB writes.
 *
 * Forwards Angel Eye (Web Serial) card events from the studio UI to the
 * backend so the player UI card flip lands in sync with the live video
 * (after the table's video_delay_ms). The authoritative hand is still the
 * Confirm & Settle bulk submit via /api/studio/manual-deal.
 *
 * Expects: { game_id, side, card, player_cards, banker_cards } or
 *          { game_id, reset: true }
 */
export async function POST(req: NextRequest) {
  const studioToken = req.cookies.get("studio_session")?.value;
  if (!studioToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const res = await fetch(`${API_URL}/internal/round/card-preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
      "X-Studio-Token": studioToken,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
