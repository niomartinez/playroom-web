import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
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

/** PATCH /api/admin-ocms/cs-users/[id] — update display_name/is_active/password
 *  only. Backend verifies the target is an ocms_cs of the token operator and
 *  never allows role/operator_id/email changes. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(`${API_URL}/internal/ocms/cs-user/${id}`, {
    method: "PATCH",
    headers: ocmsHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
