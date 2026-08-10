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

/** GET /api/admin/reports/data-range — first/last day with settled bets.


 *
 * Backs the "All time" preset: an empty date_from cannot mean "everything",
 * because every report defaults an absent date_from to the last 30 days. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const url = `${API_URL}/internal/admin/reports/data-range${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: adminHeaders(req) });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
