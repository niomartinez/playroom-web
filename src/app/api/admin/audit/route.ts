import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

function adminHeaders(req: NextRequest): Record<string, string> {
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  const h: Record<string, string> = { "Content-Type": "application/json", "X-Service-Key": SERVICE_KEY };
  if (backendToken) h["X-Admin-Token"] = backendToken;
  return h;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const res = await fetch(`${API_URL}/internal/admin/audit${qs ? `?${qs}` : ""}`, { headers: adminHeaders(req) });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
