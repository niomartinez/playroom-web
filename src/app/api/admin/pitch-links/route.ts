import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { signPitchToken, DEFAULT_EXPIRY_DAYS, MAX_EXPIRY_DAYS } from "@/lib/pitch-link";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

function backendHeaders(req: NextRequest): Record<string, string> {
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  return {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
    ...(backendToken ? { "X-Admin-Token": backendToken } : {}),
  };
}

/**
 * Mint a signed, expiring pitch-deck link. Admin-only (any admin-panel role) —
 * gated by the same `admin_session` cookie as the rest of /admin.
 *
 * POST { operator: string, days?: number } -> { token, url, expiresInDays, operator }
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const operator = typeof body.operator === "string" ? body.operator.trim().slice(0, 60) : "";
  if (!operator) {
    return NextResponse.json({ error: "Operator name is required" }, { status: 400 });
  }
  const days = Number.isFinite(body.days) ? Number(body.days) : DEFAULT_EXPIRY_DAYS;

  const token = await signPitchToken({ operator, sentBy: admin.email }, days);
  const clamped = Math.max(1, Math.min(MAX_EXPIRY_DAYS, Math.floor(days) || DEFAULT_EXPIRY_DAYS));

  // Build the absolute link from the request origin so it works on staging and
  // prod without extra config.
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
  const url = `${origin}/pitch?t=${encodeURIComponent(token)}`;

  // Record it for the history/audit — best-effort, never blocks the mint.
  const expiresAt = new Date(Date.now() + clamped * 86400_000).toISOString();
  fetch(`${API_URL}/internal/admin/pitch-link-audit`, {
    method: "POST",
    headers: backendHeaders(req),
    body: JSON.stringify({ operator, days: clamped, expires_at: expiresAt, token }),
  }).catch(() => undefined);

  return NextResponse.json({ token, url, operator, expiresInDays: clamped });
}

// History + statuses of previously minted pitch links.
export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const res = await fetch(`${API_URL}/internal/admin/pitch-links`, {
    headers: backendHeaders(req),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
