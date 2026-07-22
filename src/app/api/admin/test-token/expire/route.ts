import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * POST /api/admin/test-token/expire — expire a generated test token now.
 * Forwards the admin backend token + service key like the other /api/admin
 * proxies. The backend only ever touches generated test players (uitest-*).
 */
function headers(req: NextRequest): Record<string, string> {
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  return {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
    ...(backendToken ? { "X-Admin-Token": backendToken } : {}),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${API_URL}/internal/admin/test-token/expire`, {
    method: "POST",
    headers: headers(req),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
