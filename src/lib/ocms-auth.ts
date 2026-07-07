/** OCMS partner back-office auth — scoped external partner portal.
 *
 * Mirrors admin-auth.ts but fully isolated from the internal /admin panel:
 * - Different guard cookie name (ocms_session)
 * - Backend token stored under a DISTINCT cookie (ocms_token) so it can
 *   NEVER collide with the /admin session (admin_session / admin_backend_token)
 * - JWT is signed with ADMIN_JWT_SECRET (same HS256 secret the backend uses
 *   for admin_jwt_secret_effective) and carries operator_id so the UI can
 *   scope views. All authoritative scoping happens backend-side via the
 *   forwarded ocms_token (X-Admin-Token).
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  (() => {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (secret) return secret;
    // Vercel sets NODE_ENV=production for production AND preview deploys, so
    // gating on non-development covers preview, staging, and prod.
    if (process.env.NODE_ENV !== "development") {
      throw new Error(
        "ADMIN_JWT_SECRET env var is required in non-development environments"
      );
    }
    return "playroom-admin-secret-change-in-prod";
  })()
);

/** Guard cookie — signed by this app, verified by the proxy. */
export const OCMS_SESSION_COOKIE = "ocms_session";
/** Backend JWT — forwarded to /internal/ocms/* as X-Admin-Token. */
export const OCMS_TOKEN_COOKIE = "ocms_token";

export interface OcmsPayload {
  sub: string; // admin_users.id
  email: string;
  role: string; // ocms_admin | ocms_cs
  display_name: string;
  operator_id: string;
}

/** Create a signed JWT for the OCMS guard session. */
export async function createOcmsSession(payload: OcmsPayload): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    display_name: payload.display_name,
    operator_id: payload.operator_id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/** Verify a JWT token and return the payload, or null if invalid. */
export async function verifyOcmsSession(
  token: string
): Promise<OcmsPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      display_name: payload.display_name as string,
      operator_id: payload.operator_id as string,
    };
  } catch {
    return null;
  }
}

/** Get the current OCMS session from cookies, or null if not authenticated. */
export async function getOcmsSession(): Promise<OcmsPayload | null> {
  const jar = await cookies();
  const token = jar.get(OCMS_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyOcmsSession(token);
}

/** Clear the OCMS session cookies. */
export async function clearOcmsSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(OCMS_SESSION_COOKIE);
  jar.delete(OCMS_TOKEN_COOKIE);
}
