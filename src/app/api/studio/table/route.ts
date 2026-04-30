import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

export async function POST(req: NextRequest) {
  const body = await req.json();
  // F-08: forward the studio cookie as X-Studio-Token. Backend treats
  // the header as optional via verify_studio_token(required=False).
  const studioToken = req.cookies.get("studio_session")?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
  if (studioToken) headers["X-Studio-Token"] = studioToken;

  const res = await fetch(`${API_URL}/internal/table`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
