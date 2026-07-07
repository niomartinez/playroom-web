import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

function ocmsHeaders(req: NextRequest): Record<string, string> {
  const backendToken = req.cookies.get("ocms_token")?.value || "";
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
  if (backendToken) h["X-Admin-Token"] = backendToken;
  return h;
}

/** POST /api/admin-ocms/cs-users/[id]/reset-password
 *
 *  Resets a CS sub-account to the shared temp password and forces a change on
 *  next login. Authorization is enforced BACKEND-side (verify_ocms_token
 *  require_admin=True + same-tenant + role==ocms_cs), never here. Returns the
 *  backend BaseResponse (data.temp_password) so the UI can show it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(
    `${API_URL}/internal/ocms/cs-user/${id}/reset-password`,
    {
      method: "POST",
      headers: ocmsHeaders(req),
    }
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
