import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

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
