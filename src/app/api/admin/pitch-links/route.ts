import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { signPitchToken, DEFAULT_EXPIRY_DAYS, MAX_EXPIRY_DAYS } from "@/lib/pitch-link";

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

  return NextResponse.json({ token, url, operator, expiresInDays: clamped });
}
