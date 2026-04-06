import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://topless-casino-api.onrender.com";
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

/** GET /api/admin/players/[id] — player detail */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/internal/admin/player/${id}`, {
    headers: adminHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
