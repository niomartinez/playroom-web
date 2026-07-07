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

/** GET /api/admin-ocms/cs-users — own CS sub-accounts (backend scopes + role-guards). */
export async function GET(req: NextRequest) {
  const res = await fetch(`${API_URL}/internal/ocms/cs-users`, {
    headers: ocmsHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** POST /api/admin-ocms/cs-users — create CS sub-account. Backend FORCES
 *  role=ocms_cs + operator_id; role/operator_id from the client are ignored. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/internal/ocms/cs-user`, {
    method: "POST",
    headers: ocmsHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
