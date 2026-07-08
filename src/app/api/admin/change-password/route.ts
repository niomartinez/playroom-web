import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";
import { createAdminSession, verifyAdminSession } from "@/lib/admin-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");
const MIN_PASSWORD_LENGTH = 8;

/** POST /api/admin/change-password
 *
 *  The forced-reset escape hatch for the internal admin panel. A valid admin
 *  session is the ONLY authorization — no old password. Forwards { new_password }
 *  to the backend /internal/admin/change-password (which validates length +
 *  clears the flag + returns a fresh token), then re-issues BOTH cookies with
 *  the flag cleared so the admin isn't left locked out.
 */
export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get("admin_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const session = await verifyAdminSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const newPassword =
    body && typeof body.new_password === "string" ? body.new_password : "";

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 422 }
    );
  }

  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  if (!backendToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_URL}/internal/admin/change-password`, {
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

  // The backend returns a FRESH admin token whose must_change_password claim is
  // false. Swap it in — the current backend cookie still carries the flagged
  // claim, and the backend rejects flagged tokens on every endpoint, so without
  // this the admin stays locked out after changing their password.
  const okData = await backendRes.json().catch(() => ({}));
  const newBackendToken =
    okData && typeof okData === "object" && okData.data &&
    typeof okData.data.token === "string"
      ? (okData.data.token as string)
      : "";

  const refreshed = await createAdminSession({
    sub: session.sub,
    email: session.email,
    role: session.role,
    display_name: session.display_name,
    must_change_password: false,
  });

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 12,
    path: "/",
  };
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", refreshed, cookieOpts);
  if (newBackendToken) {
    res.cookies.set("admin_backend_token", newBackendToken, cookieOpts);
  }
  return res;
}
