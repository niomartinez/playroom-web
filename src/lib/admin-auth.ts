/** Admin panel auth — per-user email+password accounts with roles.
 *
 * Separate from studio auth:
 * - Different cookie name (admin_session)
 * - Different JWT secret (ADMIN_JWT_SECRET)
 * - JWT contains user info (id, email, role, display_name)
 *
 * Sessions are stored in a signed httpOnly cookie.
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "playroom-admin-secret-change-in-prod"
);

const COOKIE_NAME = "admin_session";

export interface AdminPayload {
  sub: string; // admin user id
  email: string;
  role: string; // superadmin | operator_admin | viewer
  display_name: string;
}

/** Create a signed JWT for the admin session. */
export async function createAdminSession(payload: AdminPayload): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    display_name: payload.display_name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/** Verify a JWT token and return the payload, or null if invalid. */
export async function verifyAdminSession(
  token: string
): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      display_name: payload.display_name as string,
    };
  } catch {
    return null;
  }
}

/** Get the current admin session from cookies, or null if not authenticated. */
export async function getAdminSession(): Promise<AdminPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

/** Clear the admin session cookie. */
export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
