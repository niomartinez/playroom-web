import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * GET /api/admin/test-token/[playerId]/activity — one token's whole story:
 * the admin actions taken on it, where it was last used from, its stream state,
 * and what it played. Backed by require_admin("test_tokens").
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  const res = await fetch(
    `${API_URL}/internal/admin/test-token/${encodeURIComponent(playerId)}/activity`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
        ...(backendToken ? { "X-Admin-Token": backendToken } : {}),
      },
    }
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
