import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";
import { makeIpMatcher, type IpMatcher } from "@/lib/ip-match";
import { BYPASS_COOKIE, verifyBypass } from "@/lib/break-glass";

/** Break-glass paths — exempt from the IP gate, see ipGateSurface(). */
const UNLOCK_PAGE = "/admin/unlock";
const UNLOCK_API = "/api/admin/unlock";

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
/** Parse a comma-separated IP env var into a trimmed, non-empty list. */
function parseIps(raw: string | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

// Internal-panel + studio IP allowlist (Option A — env-var driven).
//
// - Enforced at the Vercel edge, where the real browser IP is visible.
// - Scoped to /admin + /studio (and their /api/* routes) ONLY. /admin-ocms is
//   the EXTERNAL OCMS partner portal (unknown/rotating partner IPs) and is NEVER
//   IP-gated here.
// - Empty allowlist => INERT (allow all), so deploying this code never locks
//   anyone out until PANEL_ALLOWED_IPS is deliberately set in Vercel.
// - BREAK_GLASS_IPS are always allowed whenever the gate is active, so a bad
//   allowlist edit can't lock out the office. Defaults to the office IP even
//   when the env var is unset. See docs/SECURITY_HARDENING_2026-07-22.md.
const PANEL_ALLOWED_IPS = parseIps(process.env.PANEL_ALLOWED_IPS);
// Legacy studio-only var — unioned in so an existing STUDIO_ALLOWED_IPS keeps working.
const STUDIO_ALLOWED_IPS = parseIps(process.env.STUDIO_ALLOWED_IPS);
const BREAK_GLASS_IPS = parseIps(process.env.BREAK_GLASS_IPS || "103.66.223.116");

// The two surfaces gate independently, but STUDIO ACCESS IMPLIES ADMIN ACCESS.
//
// Each list activates only when its OWN var is set: setting PANEL_ALLOWED_IPS
// locks the back office and leaves the studio (and all player traffic) open.
// They briefly shared one unioned list in both directions, which meant locking
// the back office also gated /studio and allowed only the office IPs there —
// locking out dealers at the studio. That symmetry is what was wrong.
//
// The implication runs ONE WAY only, and deliberately:
//
//   studio IP -> may reach /admin   (the studio team has back-office accounts —
//                                    raffi, roy, Wayne — and needs to sign in
//                                    from the studio uplinks without someone
//                                    adding an allowlist row per address)
//   admin IP  -> NOT /studio        (an office address is not a licence to deal)
//
// Note this widens the network gate, not the permission gate: reaching
// /admin/login from the studio still gets you nothing without an account, and
// those accounts are read-only game_provider. Dealer credentials remain refused
// by /admin entirely (dealer is not in the backend's PANEL_ROLES).
//
// BREAK_GLASS_IPS is honoured on both, so a bad allowlist edit can't lock the
// office out of either surface.
// Entries may be bare addresses or CIDR ranges (see makeIpMatcher). A bare
// entry still matches by string equality, so every existing allowlist value
// behaves exactly as it did before ranges were supported.
const ADMIN_IP_ALLOWLIST = makeIpMatcher([
  ...PANEL_ALLOWED_IPS,
  ...STUDIO_ALLOWED_IPS,
  ...BREAK_GLASS_IPS,
]);
const STUDIO_IP_ALLOWLIST = makeIpMatcher([...STUDIO_ALLOWED_IPS, ...BREAK_GLASS_IPS]);

// ── Managed allowlist (DB-backed, edited in /admin) ─────────────────────────
//
// Entries live in the `ip_allowlist` table so they carry an owner label and the
// surfaces they may reach, and can be CRUD'd without a redeploy. They are
// UNIONED with the env vars above — never a replacement — for two reasons:
//
//   * a DB outage must degrade to the env allowlist, not lock out the office;
//   * the env vars stay the break-glass mechanism when the panel itself is the
//     thing you cannot reach.
//
// Cached in module scope with a short TTL. The edge runs many isolates, so this
// is a per-isolate cache: worst case each cold isolate does one fetch, and an
// allowlist change takes up to TTL to be visible everywhere. Failures are
// swallowed and the previous snapshot is kept (stale-if-error) — a backend blip
// must never turn into a 403 storm on the back office.
const MANAGED_TTL_MS = 60_000;
type ManagedLists = { admin: IpMatcher; studio: IpMatcher };
let managedCache: ManagedLists | null = null;
let managedFetchedAt = 0;
let managedInFlight: Promise<ManagedLists | null> | null = null;

async function fetchManagedLists(): Promise<ManagedLists | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const serviceKey = process.env.API_SERVICE_KEY;
  if (!apiUrl || !serviceKey) return null;
  try {
    const res = await fetch(`${apiUrl}/internal/ip-allowlist/effective`, {
      headers: { "X-Service-Key": serviceKey },
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? json ?? {};
    // Parsed once per refresh (every MANAGED_TTL_MS), not per request.
    const admin = Array.isArray(data.admin) ? data.admin : [];
    const studio = Array.isArray(data.studio) ? data.studio : [];
    return {
      // Same one-way implication as the env lists above: a row whose surfaces
      // are ['studio'] also opens /admin, so the studio uplinks need no second
      // entry. The reverse does not hold.
      admin: makeIpMatcher([...admin, ...studio]),
      studio: makeIpMatcher(studio),
    };
  } catch {
    return null;
  }
}

async function getManagedLists(): Promise<ManagedLists | null> {
  const now = Date.now();
  if (managedCache && now - managedFetchedAt < MANAGED_TTL_MS) return managedCache;
  // De-dupe concurrent refreshes so a burst of requests on a cold isolate makes
  // one backend call rather than one per request.
  if (!managedInFlight) {
    managedInFlight = fetchManagedLists().finally(() => {
      managedInFlight = null;
    });
  }
  const fresh = await managedInFlight;
  if (fresh) {
    managedCache = fresh;
    managedFetchedAt = now;
  }
  // stale-if-error: on failure keep serving the last good snapshot.
  return managedCache;
}

const ADMIN_GATE_ACTIVE = PANEL_ALLOWED_IPS.length > 0;
const STUDIO_GATE_ACTIVE = STUDIO_ALLOWED_IPS.length > 0;

/** Real client IP at the Vercel edge. Prefer Vercel's trusted headers over the
 *  raw left-most X-Forwarded-For entry, which a client can spoof. */
function resolveClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

/** The 403 an IP-gated surface returns.
 *
 *  This used to be `new NextResponse("Forbidden")` — a plain-text body with
 *  nothing identifying in it. Two things went wrong with that, both of which
 *  cost a live shift an hour on 2026-08-05:
 *
 *  1. A plain-text body is not JSON, so the studio login page's `res.json()`
 *     threw and it fell through to its catch-all "Invalid username or
 *     password". A dealer whose IP had rotated was told, repeatedly and with
 *     total confidence, that his password was wrong. He then swapped networks
 *     — which of course only handed him more non-allowlisted IPs.
 *  2. Nothing logged the blocked IP, so neither Vercel's logs nor the backend's
 *     showed the attempt at all. From the backend side it looked like the
 *     dealer had simply never tried to log in.
 *
 *  So: answer in JSON on API paths, say plainly what happened on page loads,
 *  echo the caller's own IP back (it is already theirs — it is not a leak, and
 *  it is the one thing whoever fixes the allowlist needs), and log it.
 */
function ipBlockedResponse(
  clientIp: string,
  surface: "admin" | "studio",
  pathname: string,
): NextResponse {
  const ip = clientIp || "unknown";
  console.warn(
    `[ip-gate] blocked ${surface} request from ${ip} to ${pathname}`,
  );
  const message =
    `This device's IP (${ip}) is not on the ${surface} allowlist. ` +
    `This is not a password problem — send this IP to the dev team to be added.`;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: message, error_code: "1403", ip, surface },
      { status: 403 },
    );
  }
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Access blocked</title>` +
      `<div style="font:16px/1.6 system-ui,sans-serif;max-width:34rem;margin:15vh auto;padding:0 1.5rem;color:#eee;background:#111">` +
      `<h1 style="font-size:1.25rem;color:#e5b567">Access blocked</h1>` +
      `<p>${message}</p>` +
      // The person reading this is locked out and has no other channel open.
      // Naming the way back in is the whole point of the page.
      `<p>If you have the break-glass code, <a href="${UNLOCK_PAGE}" style="color:#e5b567">unlock this device</a>, then add this IP in the panel so the next person does not hit this.</p>` +
      `<p style="opacity:.7;font-size:.9rem">IP: <code>${ip}</code> &middot; surface: <code>${surface}</code></p>` +
      `</div>`,
    { status: 403, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

/** Which IP-gated surface this path belongs to, if any.
 *
 *  `admin`  — the internal back office (/admin + /api/admin/).
 *  `studio` — the dealer surface (/studio + /api/studio/).
 *  `null`   — everything else: all player traffic AND the OCMS partner portal
 *             (/admin-ocms + /api/admin-ocms), whose partner IPs are unknown and
 *             rotating, so it is NEVER IP-gated here.
 *
 *  The /admin-ocms check must come first: "/admin-ocms" also matches
 *  startsWith("/admin"), so testing admin first would gate the partner portal. */
function ipGateSurface(pathname: string): "admin" | "studio" | null {
  if (
    pathname.startsWith("/admin-ocms") ||
    pathname.startsWith("/api/admin-ocms")
  ) {
    return null;
  }
  // Break-glass must be reachable from the very place the gate is refusing,
  // or it is not a break-glass. These two paths hold no data: one renders a
  // form, the other checks a secret. Everything behind them is still gated.
  if (pathname === UNLOCK_PAGE || pathname === UNLOCK_API) {
    return null;
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin/")) {
    return "admin";
  }
  if (pathname.startsWith("/studio") || pathname.startsWith("/api/studio/")) {
    return "studio";
  }
  return null;
}

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

  // Option A IP allowlist — edge-enforced, per-surface, OCMS + players excluded.
  // Each surface is inert until its OWN env var is set in Vercel:
  //   PANEL_ALLOWED_IPS  -> locks /admin  (back office)
  //   STUDIO_ALLOWED_IPS -> locks /studio (dealer surface)
  // so the back office can be locked down without risking a studio lockout.
  const ipSurface = ipGateSurface(pathname);
  if (ipSurface) {
    const gateActive =
      ipSurface === "admin" ? ADMIN_GATE_ACTIVE : STUDIO_GATE_ACTIVE;
    if (gateActive) {
      const envList =
        ipSurface === "admin" ? ADMIN_IP_ALLOWLIST : STUDIO_IP_ALLOWLIST;
      const clientIp = resolveClientIp(req);
      let allowed = envList.test(clientIp);
      if (!allowed && clientIp) {
        // Only consult the managed list when the env list already said no, so
        // the common allowed case costs nothing.
        const managed = await getManagedLists();
        allowed = Boolean(managed?.[ipSurface].test(clientIp));
      }
      if (!allowed && clientIp) {
        // Break-glass, checked LAST so it costs nothing on the normal path and
        // can never widen an allowlist decision that already said yes. The
        // cookie is bound to this IP, so it is not a portable credential.
        const secret = process.env.ADMIN_JWT_SECRET;
        const cookie = req.cookies.get(BYPASS_COOKIE)?.value;
        if (secret && cookie) {
          allowed = await verifyBypass(secret, cookie, clientIp);
        }
      }
      if (!allowed) {
        return ipBlockedResponse(clientIp, ipSurface, pathname);
      }
    }
  }

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
    // Break-glass, same reasoning as the login route: the caller has no session
    // yet and cannot get one until they are through the network gate. Requiring
    // a session here would send a locked-out person to a login page they are
    // still blocked from — which is the loop this exists to break.
    if (pathname === UNLOCK_API) return NextResponse.next();

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
    // …and the break-glass form, for the same reason: it runs BEFORE any
    // session exists. Redirecting it to /admin/login would bounce a
    // locked-out person straight back into the 403 they came from.
    if (pathname === UNLOCK_PAGE) return NextResponse.next();

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

  // IP whitelist for /studio is now handled by the unified edge gate at the top
  // of proxy() (isPanelIpScoped + PANEL_IP_ALLOWLIST).

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
    "/api/studio/:path*",
    "/admin-ocms/:path*",
    "/api/admin-ocms/:path*",
  ],
};
