import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { validateCredentials, createSession, isIpAllowed } from "@/lib/auth";
import { requireEnv } from "@/lib/server-env";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

const COOKIE_NAME = "studio_session";
const DEFAULT_MAX_AGE = 60 * 60 * 12; // 12h fallback

/**
 * F-08 Phase B: studio login.
 *
 * 1. Try the backend's per-dealer login (`POST /internal/studio/login`).
 *    On success, set the `studio_session` cookie to the BACKEND-signed JWT
 *    so the proxy + downstream routes can pull `admin_id` / `role` claims.
 * 2. If the backend rejects (401/403) or is unreachable, fall back to the
 *    legacy shared-credential path (`validateCredentials` + Next-side
 *    `createSession`). This keeps the old single-credential flow working
 *    as a safety net during the 7-day cutover window.
 *
 * TODO: F-08 burn-down — remove the legacy fallback after ~2026-05-07.
 */
export async function POST(req: NextRequest) {
  // IP check
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  if (!isIpAllowed(clientIp)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, password } = await req.json();

  // ── Step 1: backend per-dealer login ────────────────────────────────
  let backendToken: string | null = null;
  let backendStatus = 0;
  let backendError: { error_code?: string; message?: string } | null = null;
  try {
    const res = await fetch(`${API_BASE}/internal/studio/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
    backendStatus = res.status;
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const token = data?.data?.token;
      if (typeof token === "string" && token.length > 0) {
        backendToken = token;
      }
    } else {
      backendError = {
        error_code: data?.error_code,
        message: data?.message || data?.detail || data?.error,
      };
    }
  } catch {
    // Network / DNS / backend down — fall through to legacy fallback.
    backendStatus = 0;
  }

  if (backendToken) {
    // Decode the JWT (no verification — we just minted-via-backend, and
    // we only need `exp` to align cookie max-age). decodeJwt does not
    // throw a verify error; it only checks shape.
    let maxAge = DEFAULT_MAX_AGE;
    try {
      const claims = decodeJwt(backendToken);
      if (typeof claims.exp === "number") {
        const ttl = claims.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) maxAge = ttl;
      }
    } catch {
      // Bad JWT shape — fall back to default 12h. The proxy will still
      // verify the signature on every request.
    }

    const response = NextResponse.json({ ok: true, source: "backend" });
    response.cookies.set(COOKIE_NAME, backendToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });
    return response;
  }

  // ── Step 2: legacy shared-credential fallback ───────────────────────
  // Only attempt the legacy path when the backend returned an auth
  // failure (401/403) or was unreachable. A 5xx from the backend on a
  // valid creds means the per-dealer DB is broken, but the operator
  // still wants to be able to start a round, so we let the legacy path
  // try too.
  const legacyAllowed =
    backendStatus === 0 ||
    backendStatus === 401 ||
    backendStatus === 403 ||
    backendStatus >= 500;

  if (legacyAllowed && validateCredentials(username, password)) {
    if (backendStatus === 0 || backendStatus >= 500) {
      console.warn(
        `[studio-login] backend unavailable (status=${backendStatus}); falling back to legacy shared-credential path. Round actions will be stamped dealer_id="legacy" and cannot be attributed.`,
      );
    }
    const token = await createSession();
    const response = NextResponse.json({ ok: true, source: "legacy" });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: DEFAULT_MAX_AGE,
      path: "/",
    });
    return response;
  }

  // Both paths failed — return the backend's error if we have one,
  // otherwise a generic 401.
  return NextResponse.json(
    {
      error:
        backendError?.message || "Invalid credentials",
      error_code: backendError?.error_code,
    },
    { status: backendStatus === 403 ? 403 : 401 },
  );
}
