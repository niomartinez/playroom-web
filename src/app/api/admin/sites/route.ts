import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

function adminHeaders(req: NextRequest): Record<string, string> {
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
  if (backendToken) h["X-Admin-Token"] = backendToken;
  return h;
}

/** GET /api/admin/sites — the downstream sites, for the filter dropdowns.
 *
 * Backend-gated on the `reports` section, not `players`: game_provider holds
 * reports:READ and players:NONE, and this same list populates the filter on
 * the reports page they are allowed to see. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const url = `${API_URL}/internal/admin/sites${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: adminHeaders(req) });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
