/** Simple shared-credential auth for the studio UI.
 *
 * Studio access requires:
 * 1. Valid username/password (shared credentials from env vars)
 * 2. IP whitelist check (configured via STUDIO_ALLOWED_IPS env var)
 *
 * Sessions are stored in a signed cookie.
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Resolve a required env var. In development, falls back to `devFallback`
 * so local dev keeps working. In any non-development env (preview, staging,
 * production — Vercel sets NODE_ENV=production for all of these), throws
 * loudly at module load if the variable is missing.
 */
function requireEnv(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      `${name} env var is required in non-development environments`
    );
  }
  return devFallback;
}

const STUDIO_USER = requireEnv("STUDIO_USERNAME", "admin");
const STUDIO_PASS = requireEnv("STUDIO_PASSWORD", "changeme");
const JWT_SECRET = new TextEncoder().encode(
  requireEnv("STUDIO_JWT_SECRET", "playroom-studio-secret-change-in-prod")
);
const ALLOWED_IPS = (process.env.STUDIO_ALLOWED_IPS || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const COOKIE_NAME = "studio_session";

export function isIpAllowed(ip: string | null): boolean {
  // If no IPs configured, allow all (dev mode)
  if (ALLOWED_IPS.length === 0) return true;
  if (!ip) return false;
  return ALLOWED_IPS.includes(ip);
}

export function validateCredentials(username: string, password: string): boolean {
  return username === STUDIO_USER && password === STUDIO_PASS;
}

export async function createSession(): Promise<string> {
  return new SignJWT({ role: "studio" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySession(token);
}
