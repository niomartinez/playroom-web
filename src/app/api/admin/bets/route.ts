import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_backend_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const response = await fetch(`${API_URL}/internal/admin/bets?${req.nextUrl.searchParams}`, {
    headers: { "X-Service-Key": SERVICE_KEY, "X-Admin-Token": token },
    cache: "no-store",
  });
  const body = await response.json();
  // Keep FastAPI validation failures readable through the shared query hook.
  if (!response.ok && !body.message) body.message = typeof body.detail === "string" ? body.detail : "Invalid bet-log filters";
  return NextResponse.json(body, { status: response.status, headers: { "Cache-Control": "private, no-store" } });
}
