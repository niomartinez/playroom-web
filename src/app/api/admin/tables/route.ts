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
 * GET /api/admin/tables — list this environment's tables.
 *
 * `env_scoped` drops the tables that belong to the other environment: prod
 * carries TEST-BAC-TABLE-01/02 alongside the live tables, and staging carries
 * the real BAC-TABLE-* rows. Unscoped, the prod admin panel listed QA fixtures
 * next to the tables real money is on, with nothing in the row to tell them
 * apart.
 */
export async function GET(req: NextRequest) {
  const res = await fetch(`${API_URL}/internal/tables?env_scoped=true`, {
    headers: adminHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

/** POST /api/admin/tables — create a new table */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/internal/table`, {
    method: "POST",
    headers: adminHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
