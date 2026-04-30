import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

export async function POST(req: NextRequest) {
  const body = await req.json();
  // F-08: forward the studio cookie as X-Studio-Token so the backend
  // can stamp dealer_id on the resulting fight. Header is optional —
  // backend's verify_studio_token(required=False) ignores absence.
  const studioToken = req.cookies.get("studio_session")?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
  if (studioToken) headers["X-Studio-Token"] = studioToken;

  const res = await fetch(`${API_URL}/internal/round/start`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
