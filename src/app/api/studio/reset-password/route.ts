import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/** Superadmin resets another account's password (role enforced backend-side). */
export async function POST(req: NextRequest) {
  const studioToken = req.cookies.get("studio_session")?.value;
  if (!studioToken) {
    return NextResponse.json({ error_code: "1001", message: "Not authenticated" }, { status: 401 });
  }
  const body = await req.json();
  const res = await fetch(`${API_URL}/internal/studio/reset-password`, {
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
  return NextResponse.json(data?.detail ?? data, { status: res.status });
}
