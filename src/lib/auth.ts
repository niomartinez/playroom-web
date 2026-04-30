/** Studio auth — dual-secret cutover during F-08 Phase B.
 *
 * Studio access requires:
 * 1. A valid `studio_session` cookie (verified via JWT).
 * 2. IP whitelist check (configured via STUDIO_ALLOWED_IPS env var).
 *
 * The cookie may be signed with EITHER:
 *   - ADMIN_JWT_SECRET — backend-issued JWT from POST /internal/studio/login
 *     (per-dealer accounts; carries `admin_id`, `email`, `display_name`,
 *     `role` claims). This is the path every NEW login takes.
 *   - STUDIO_JWT_SECRET — legacy Next-side mint via `createSession()`,
 *     used as a fallback during cutover and for active sessions issued
 *     before this change deployed.
 *
 * `verifySession` / `getSession` try ADMIN_JWT_SECRET first, then fall
 * back to STUDIO_JWT_SECRET. Both env vars must exist in non-development
 * environments — `requireEnv` enforces that at module load.
 *
 * TODO: F-08 burn-down — remove legacy STUDIO_JWT_SECRET verification +
 * the `validateCredentials` / legacy `createSession` shared-credential
 * fallback after ~2026-05-07 (7 days post-deploy, after every legacy
 * 12h cookie has expired).
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { requireEnv } from "@/lib/server-env";

const STUDIO_USER = requireEnv("STUDIO_USERNAME", "admin");
const STUDIO_PASS = requireEnv("STUDIO_PASSWORD", "changeme");
const STUDIO_JWT_SECRET = new TextEncoder().encode(
  requireEnv("STUDIO_JWT_SECRET", "playroom-studio-secret-change-in-prod"),
);
const ADMIN_JWT_SECRET = new TextEncoder().encode(
  requireEnv("ADMIN_JWT_SECRET", "playroom-admin-secret-change-in-prod"),
);
const ALLOWED_IPS = (process.env.STUDIO_ALLOWED_IPS || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const COOKIE_NAME = "studio_session";

export interface StudioSession {
  /** Stable dealer identifier — `admin_id` for backend-issued JWTs,
   *  or "legacy" for the shared-credential fallback. */
  dealerId: string;
  /** Display name from backend JWT, undefined for legacy. */
  displayName?: string;
  /** Email from backend JWT, undefined for legacy. */
  email?: string;
  /** Role claim — "dealer" / "admin" / "superadmin" for backend-issued,
   *  "studio" for legacy. */
  role: string;
  /** True when the cookie was verified against ADMIN_JWT_SECRET (i.e.
   *  backend-issued per-dealer JWT). False = legacy Next-signed cookie. */
  backendIssued: boolean;
}

export function isIpAllowed(ip: string | null): boolean {
  // If no IPs configured, allow all (dev mode)
  if (ALLOWED_IPS.length === 0) return true;
  if (!ip) return false;
  return ALLOWED_IPS.includes(ip);
}

export function validateCredentials(username: string, password: string): boolean {
  return username === STUDIO_USER && password === STUDIO_PASS;
}

/** Legacy Next-signed studio session — used as a fallback when the
 *  backend's /internal/studio/login is unavailable or rejects the
 *  shared-credential pair. */
export async function createSession(): Promise<string> {
  return new SignJWT({ role: "studio" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .setIssuedAt()
    .sign(STUDIO_JWT_SECRET);
}

/** Verify the studio cookie. Returns the decoded session on success, or
 *  null when neither secret accepts the JWT. */
export async function verifySession(token: string): Promise<StudioSession | null> {
  // TODO: F-08 burn-down — remove the STUDIO_JWT_SECRET branch after
  // ~2026-05-07 (7 days post-deploy).
  try {
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);
    return decodeBackendPayload(payload);
  } catch {
    // Fall through to legacy verifier.
  }
  try {
    const { payload } = await jwtVerify(token, STUDIO_JWT_SECRET);
    return decodeLegacyPayload(payload);
  } catch {
    return null;
  }
}

function decodeBackendPayload(payload: JWTPayload): StudioSession {
  const adminId =
    typeof payload.admin_id === "string"
      ? payload.admin_id
      : typeof payload.sub === "string"
        ? payload.sub
        : "unknown";
  const role = typeof payload.role === "string" ? payload.role : "dealer";
  return {
    dealerId: adminId,
    displayName:
      typeof payload.display_name === "string" ? payload.display_name : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
    role,
    backendIssued: true,
  };
}

function decodeLegacyPayload(payload: JWTPayload): StudioSession {
  return {
    dealerId: "legacy",
    role: typeof payload.role === "string" ? payload.role : "studio",
    backendIssued: false,
  };
}

/** Returns the active studio session (decoded), or null if no valid
 *  cookie is present. */
export async function getSession(): Promise<StudioSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
