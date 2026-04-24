import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = process.env.API_SERVICE_KEY || "";

function adminHeaders(req: NextRequest): Record<string, string> {
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
  if (backendToken) h["X-Admin-Token"] = backendToken;
  return h;
}

/** GET /api/admin/rounds — list rounds with filters */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const url = `${API_URL}/internal/admin/rounds${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: adminHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
