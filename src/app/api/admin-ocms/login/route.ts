import { NextRequest, NextResponse } from "next/server";
import { createOcmsSession } from "@/lib/ocms-auth";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/** Backend `detail` can be a string, {error_code,message}, or a 422 array
 *  of Pydantic errors. Always reduce to a human-readable string — the login
 *  page renders this value directly (rendering an object crashes React). */
function detailToMessage(errData: unknown): string {
  const detail =
    errData && typeof errData === "object" && "detail" in errData
      ? (errData as { detail: unknown }).detail
      : errData;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first && typeof first.msg === "string") return first.msg;
    return "Invalid input";
  }
  if (detail && typeof detail === "object") {
    const msg =
      (detail as { message?: unknown }).message ??
      (detail as { error?: unknown }).error;
    if (typeof msg === "string") return msg;
  }
  return "Login failed";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_URL}/internal/ocms/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the authentication service. Try again." },
      { status: 502 }
    );
  }

  if (!backendRes.ok) {
    const errData = await backendRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: detailToMessage(errData) },
      { status: backendRes.status }
    );
  }

  const rawData = await backendRes.json();
  // Backend wraps response in BaseResponse: { error_code, message, data: { ... } }
  const data = rawData.data || rawData;

  const mustChangePassword = data.must_change_password === true;

  const token = await createOcmsSession({
    sub: data.admin_id || data.id || data.user_id || "",
    email: data.email || "",
    role: data.role || "ocms_cs",
    display_name: data.display_name || data.name || "",
    operator_id: data.operator_id || "",
    must_change_password: mustChangePassword,
  });

  // Surface the flag so the login page can redirect straight to the
  // force-password screen (the middleware guard also enforces it).
  const res = NextResponse.json({
    ok: true,
    must_change_password: mustChangePassword,
  });
  res.cookies.set("ocms_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12 hours
    path: "/",
  });

  // Backend JWT — forwarded to /internal/ocms/* as X-Admin-Token.
  if (data.token) {
    res.cookies.set("ocms_token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12,
      path: "/",
    });
  }

  return res;
}
