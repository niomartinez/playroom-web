import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Reveal the OBS publish credentials on the guide page.
 *
 * Double-gated: needs the studio_session cookie AND the dealer's password
 * (re-auth happens backend-side against admin_users.password_hash).
 */
export async function POST(req: NextRequest) {
  const studioToken = req.cookies.get("studio_session")?.value;
  if (!studioToken) {
    return NextResponse.json(
      { error_code: "1001", message: "Log in to the studio first." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const res = await fetch(`${API_URL}/internal/studio/stream-credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
      "X-Studio-Token": studioToken,
    },
    body: JSON.stringify({ password: body.password }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  // FastAPI HTTPException payloads arrive as {detail:{error_code,message}}
  const flat = data?.detail ?? data;
  return NextResponse.json(flat, { status: res.status });
}
