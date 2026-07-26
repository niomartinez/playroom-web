import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Mint a "Preview Live" session for the studio's own table.
 *
 * Requires the studio_session cookie — the backend binds the returned link's
 * signature to the studio account in that token, so a link minted here is not
 * redeemable in anyone else's context.
 */
export async function POST(req: NextRequest) {
  const studioToken = req.cookies.get("studio_session")?.value;
  if (!studioToken) {
    return NextResponse.json(
      { error_code: "1001", message: "Log in to the studio first." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${API_URL}/internal/studio/preview-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
      "X-Studio-Token": studioToken,
    },
    body: JSON.stringify({ table: body.table }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  const flat = data?.detail ?? data;
  return NextResponse.json(flat, { status: res.status });
}
