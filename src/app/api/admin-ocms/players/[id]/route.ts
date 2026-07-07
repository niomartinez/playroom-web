import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

function ocmsHeaders(req: NextRequest): Record<string, string> {
  const backendToken = req.cookies.get("ocms_token")?.value || "";
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
  if (backendToken) h["X-Admin-Token"] = backendToken;
  return h;
}

/** GET /api/admin-ocms/players/[id] — player detail (backend verifies ownership). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/internal/ocms/player/${id}`, {
    headers: ocmsHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
