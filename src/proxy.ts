import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const STUDIO_JWT_SECRET = new TextEncoder().encode(
  process.env.STUDIO_JWT_SECRET || "playroom-studio-secret-change-in-prod"
);
const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "playroom-admin-secret-change-in-prod"
);
const ALLOWED_IPS = (process.env.STUDIO_ALLOWED_IPS || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
      await jwtVerify(token, ADMIN_JWT_SECRET);
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
      await jwtVerify(token, ADMIN_JWT_SECRET);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
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

  // Session check
  const token = req.cookies.get("studio_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/studio/login", req.url));
  }

  try {
    await jwtVerify(token, STUDIO_JWT_SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/studio/login", req.url));
  }
}

export const config = {
  matcher: ["/studio/:path*", "/emulator/:path*", "/admin/:path*", "/api/admin/:path*"],
};
