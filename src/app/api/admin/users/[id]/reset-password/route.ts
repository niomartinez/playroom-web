import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

function adminHeaders(req: NextRequest): Record<string, string> {
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
  if (backendToken) h["X-Admin-Token"] = backendToken;
  return h;
}

/**
 * POST /api/admin/users/[id]/reset-password
 * Superadmin-only. Backend resets the account to the shared temp password and
 * flags must_change_password. Authorization is enforced by the backend token role.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(
    `${API_URL}/internal/admin/user/${id}/reset-password`,
    {
      method: "POST",
      headers: adminHeaders(req),
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
