import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
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

/** PATCH /api/admin/mock/prefs — a manager toggles their OWN show/hide +
 *  label/unlabel of the mock site. Deliberately unaudited on the backend. */
export async function PATCH(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${API_URL}/internal/admin/mock/prefs`, {
    method: "PATCH",
    headers: adminHeaders(req),
    body,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
