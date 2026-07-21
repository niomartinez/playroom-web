import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

export async function POST(req: NextRequest) {
  const body = await req.json();
  // A valid studio session is REQUIRED to start a round (2026-07-22 hardening).
  const studioToken = req.cookies.get("studio_session")?.value;
  if (!studioToken) {
    return NextResponse.json(
      { error_code: "1001", message: "Not authenticated" },
      { status: 401 },
    );
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
    "X-Studio-Token": studioToken,
  };

  const res = await fetch(`${API_URL}/internal/round/start`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
