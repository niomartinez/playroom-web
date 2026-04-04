import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://topless-casino-api.onrender.com";
const SERVICE_KEY = process.env.API_SERVICE_KEY || "";

/** POST /api/admin/operators/[id]/regenerate-key — regenerate operator API key */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
  if (backendToken) headers["X-Admin-Token"] = backendToken;

  const res = await fetch(
    `${API_URL}/internal/operators/${id}/regenerate-key`,
    {
      method: "POST",
      headers,
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
