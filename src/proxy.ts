import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

function getJwtSecret(envVar: string, name: string): Uint8Array {
  const secret = process.env[envVar];
  // Vercel sets NODE_ENV=production for production AND preview deploys, so
  // gating on non-development covers preview, staging, and prod.
  if (!secret && process.env.NODE_ENV !== "development") {
    throw new Error(
      `${envVar} env var is required in non-development environments`
    );
  }
  return new TextEncoder().encode(
    secret || `playroom-${name}-secret-change-in-prod`
  );
}

const STUDIO_JWT_SECRET = getJwtSecret("STUDIO_JWT_SECRET", "studio");
const ADMIN_JWT_SECRET = getJwtSecret("ADMIN_JWT_SECRET", "admin");

// The backend signs studio/admin JWTs with its ADMIN_JWT_SECRET, but where the
// backend has NO ADMIN_JWT_SECRET set it falls back to its service key (see the
// backend's admin_jwt_secret_effective). The frontend holds that same value as
// API_SERVICE_KEY (what it sends as X-Service-Key and the backend accepts), so
// we must verify against it too — otherwise a valid, backend-issued studio
// cookie fails to verify and /studio bounces straight back to /studio/login on
// every login. Only used when the env var is present (never the dev default).
const BACKEND_SERVICE_KEY = process.env.API_SERVICE_KEY
  ? new TextEncoder().encode(process.env.API_SERVICE_KEY)
  : null;
const ALLOWED_IPS = (process.env.STUDIO_ALLOWED_IPS || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

/**
 * F-08 Phase B dual-verify: studio cookies issued AFTER the cutover are
 * signed with ADMIN_JWT_SECRET (backend-issued JWT carrying admin_id +
 * role). Cookies issued BEFORE the cutover are signed with the legacy
 * STUDIO_JWT_SECRET. We try the new secret first, fall back to legacy.
 *
 * TODO: F-08 burn-down — remove the STUDIO_JWT_SECRET branch after
 * ~2026-05-07 (7 days post-deploy).
 */
async function verifyStudioCookie(
  token: string,
): Promise<{ payload: JWTPayload } | null> {
  try {
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);
    return { payload };
  } catch {
    // Fall through to legacy verifier.
  }
  try {
    const { payload } = await jwtVerify(token, STUDIO_JWT_SECRET);
    return { payload };
  } catch {
    // Fall through to the backend service-key fallback.
  }
  if (BACKEND_SERVICE_KEY) {
    try {
      const { payload } = await jwtVerify(token, BACKEND_SERVICE_KEY);
      return { payload };
    } catch {
      return null;
    }
  }
  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* ── OCMS partner-portal API routes (return 401 JSON, no redirect) ──
   * Handled BEFORE the /admin branches because "/admin-ocms" also matches
   * startsWith("/admin"). The OCMS guard cookie (ocms_session) is fully
   * distinct from the /admin panel cookie (admin_session). */
  if (pathname.startsWith("/api/admin-ocms/")) {
    if (
      pathname === "/api/admin-ocms/login" ||
      pathname === "/api/admin-ocms/logout"
    ) {
      return NextResponse.next();
    }

    const token = req.cookies.get("ocms_session")?.value;
    if (!token) {
      return NextResponse.json(
        { error_code: "1001", message: "Unauthorized" },
        { status: 401 }
      );
    }

    try {
      const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);
      // Force-password-change gate for the API routes (defense-in-depth; the
      // backend also rejects flagged tokens). A flagged session may only reach
      // change-password + logout — otherwise it could script the data/mutation
      // routes directly, bypassing the page redirect.
      if (
        payload.must_change_password === true &&
        pathname !== "/api/admin-ocms/change-password" &&
        pathname !== "/api/admin-ocms/logout" &&
        pathname !== "/api/admin-ocms/me"
      ) {
        return NextResponse.json(
          { error_code: "1006", message: "Password change required" },
          { status: 403 }
        );
      }
      return NextResponse.next();
    } catch {
      return NextResponse.json(
        { error_code: "1002", message: "Invalid or expired session" },
        { status: 401 }
      );
    }
  }

  /* ── OCMS partner-portal page routes ── */
  if (pathname.startsWith("/admin-ocms")) {
    if (pathname === "/admin-ocms/login") return NextResponse.next();

    const token = req.cookies.get("ocms_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin-ocms/login", req.url));
    }

    try {
      const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);
      // Force-password-change enforcement: a flagged user is redirected to the
      // force-password page on EVERY panel route until they change it. The
      // page itself is whitelisted so the redirect can't loop.
      const mustChange = payload.must_change_password === true;
      const onForcePage = pathname === "/admin-ocms/force-password";
      if (mustChange && !onForcePage) {
        return NextResponse.redirect(
          new URL("/admin-ocms/force-password", req.url)
        );
      }
      // A non-flagged user has no business on the force page — bounce home.
      if (!mustChange && onForcePage) {
        return NextResponse.redirect(new URL("/admin-ocms", req.url));
      }
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/admin-ocms/login", req.url));
    }
  }

  /* ── Admin API routes (return 401 JSON, no redirect) ── */
  if (pathname.startsWith("/api/admin/")) {
    // Allow login/logout endpoints without auth
    if (pathname === "/api/admin/login" || pathname === "/api/admin/logout") {
      return NextResponse.next();
    }

    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      return NextResponse.json(
        { error_code: "1001", message: "Unauthorized" },
        { status: 401 }
      );
    }

    try {
      const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);
      // Force-password-change gate for the API routes (defense-in-depth; the
      // backend also rejects flagged tokens). A flagged session may only reach
      // change-password + logout + me, else it could script the API directly.
      if (
        payload.must_change_password === true &&
        pathname !== "/api/admin/change-password" &&
        pathname !== "/api/admin/logout" &&
        pathname !== "/api/admin/me"
      ) {
        return NextResponse.json(
          { error_code: "1006", message: "Password change required" },
          { status: 403 }
        );
      }
      return NextResponse.next();
    } catch {
      return NextResponse.json(
        { error_code: "1002", message: "Invalid or expired session" },
        { status: 401 }
      );
    }
  }

  /* ── Admin page routes ── */
  if (pathname.startsWith("/admin")) {
    // Allow the login page without auth
    if (pathname === "/admin/login") return NextResponse.next();

    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    try {
      const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);
      // Force-password-change: a flagged admin is redirected to the
      // force-password page on EVERY admin route until they change it; the
      // page itself is whitelisted so the redirect can't loop.
      const mustChange = payload.must_change_password === true;
      const onForcePage = pathname === "/admin/force-password";
      if (mustChange && !onForcePage) {
        return NextResponse.redirect(new URL("/admin/force-password", req.url));
      }
      if (!mustChange && onForcePage) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  /* ── Emulator DECOMMISSIONED (2026-07-22): 404 on ALL environments ──
     The mock-round control panel is retired; the studio deals via /studio. Code
     kept, surface gated off everywhere. */
  if (pathname.startsWith("/emulator")) {
    return new NextResponse("Not found", { status: 404 });
  }

  /* ── Studio / Emulator routes ── */
  const isProtected =
    pathname.startsWith("/studio") || pathname.startsWith("/emulator");
  if (!isProtected) return NextResponse.next();
  if (pathname === "/studio/login") return NextResponse.next();

  // IP whitelist check (studio only)
  if (ALLOWED_IPS.length > 0) {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    if (!ALLOWED_IPS.includes(clientIp)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // Session check (dual-verify: backend JWT first, legacy fallback).
  const token = req.cookies.get("studio_session")?.value;
  if (!token) {
    const loginUrl = new URL("/studio/login", req.url);
    // Preserve the path the user originally requested so login can send
    // them back (e.g. /emulator → /studio/login?next=/emulator → /emulator).
    if (pathname !== "/studio") {
      loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  const verified = await verifyStudioCookie(token);
  if (!verified) {
    const loginUrl = new URL("/studio/login", req.url);
    // Preserve the path the user originally requested so login can send
    // them back (e.g. /emulator → /studio/login?next=/emulator → /emulator).
    if (pathname !== "/studio") {
      loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Stamp dealer identity into the forwarded request headers so downstream
  // route handlers + RSCs can attribute studio actions without re-verifying
  // the JWT. Backend-issued JWTs carry `admin_id` + `role`; legacy cookies
  // only have `role: "studio"` so dealer-id falls back to "legacy".
  const adminId =
    typeof verified.payload.admin_id === "string"
      ? verified.payload.admin_id
      : typeof verified.payload.sub === "string"
        ? verified.payload.sub
        : "legacy";
  const role =
    typeof verified.payload.role === "string" ? verified.payload.role : "studio";

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-dealer-id", adminId);
  requestHeaders.set("x-dealer-role", role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/emulator/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/admin-ocms/:path*",
    "/api/admin-ocms/:path*",
  ],
};
