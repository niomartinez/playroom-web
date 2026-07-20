import { NextRequest, NextResponse } from "next/server";
import { requireEnv, isProdEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * POST /api/admin/test-token — proxy to the backend test-token generator.
 * STAGING-ONLY: 404 on prod (the backend also refuses). Forwards the admin
 * backend token + service key like the other /api/admin proxies.
 */
export async function POST(req: NextRequest) {
  if (isProdEnv()) {
    return NextResponse.json(
      { error: "Test tokens are staging-only." },
      { status: 404 },
    );
  }
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${API_URL}/internal/admin/test-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
      ...(backendToken ? { "X-Admin-Token": backendToken } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
