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

/** POST /api/admin/tables/[id]/close — close table */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/internal/table/${id}/close`, {
    method: "POST",
    headers: adminHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
