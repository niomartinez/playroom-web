import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import {
  OCMS_SESSION_COOKIE,
  createOcmsSession,
  verifyOcmsSession,
} from "@/lib/ocms-auth";
import { OCMS_MIN_PASSWORD_LENGTH } from "@/lib/ocms-constants";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/** POST /api/admin-ocms/change-password
 *
 *  The forced-reset escape hatch. A valid OCMS session is the ONLY
 *  authorization — no old password. Forwards { new_password } to the backend
 *  /internal/ocms/change-password (which validates length + clears the flag),
 *  then re-issues the guard cookie with must_change_password=false so the
 *  middleware stops redirecting to the force-password page.
 */
export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(OCMS_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = await verifyOcmsSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const newPassword =
    body && typeof body.new_password === "string" ? body.new_password : "";

  // Client-side already checks length + confirm-match; re-check length here
  // so a direct API call can never set a too-short password.
  if (newPassword.length < OCMS_MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        error: `Password must be at least ${OCMS_MIN_PASSWORD_LENGTH} characters`,
      },
      { status: 422 }
    );
  }

  const backendToken = req.cookies.get("ocms_token")?.value || "";
  if (!backendToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_URL}/internal/ocms/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
        "X-Admin-Token": backendToken,
      },
      body: JSON.stringify({ new_password: newPassword }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the service. Try again." },
      { status: 502 }
    );
  }

  if (!backendRes.ok) {
    const errData = await backendRes.json().catch(() => ({}));
    const detail =
      errData && typeof errData === "object" && "detail" in errData
        ? (errData as { detail: unknown }).detail
        : undefined;
    const message =
      typeof detail === "string"
        ? detail
        : detail && typeof detail === "object" && "message" in detail
          ? String((detail as { message: unknown }).message)
          : "Failed to change password";
    return NextResponse.json({ error: message }, { status: backendRes.status });
  }

  // Re-issue the guard cookie with the flag cleared so navigation is unblocked.
  const refreshed = await createOcmsSession({
    sub: session.sub,
    email: session.email,
    role: session.role,
    display_name: session.display_name,
    operator_id: session.operator_id,
    must_change_password: false,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OCMS_SESSION_COOKIE, refreshed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return res;
}
