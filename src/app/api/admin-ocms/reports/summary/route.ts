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

/** GET /api/admin-ocms/reports/summary — GGR summary (operator-scoped). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const url = `${API_URL}/internal/ocms/reports/summary${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: ocmsHeaders(req) });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
