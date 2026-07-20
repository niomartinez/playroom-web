/**
 * Signed, expiring access links for the operator pitch deck (`/pitch`).
 *
 * Sales generates a per-recipient link that carries a JWT: the operator name
 * (which becomes the tamper-proof watermark), an expiry, and who sent it. The
 * `/pitch` route verifies the signature server-side and rejects expired or
 * tampered tokens. This replaces the old open `?o=` query param — which anyone
 * could edit to change or strip the watermark, on a route open to anyone with
 * the URL.
 *
 * Signed with `PITCH_LINK_SECRET` (falls back to `ADMIN_JWT_SECRET` so it works
 * without extra env config; a dedicated secret is preferred). The `typ: "pitch"`
 * claim means an admin-session JWT can never be replayed as a pitch link, or
 * vice-versa, even when they share a secret.
 */
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  (() => {
    const s = process.env.PITCH_LINK_SECRET || process.env.ADMIN_JWT_SECRET;
    if (s) return s;
    // Vercel sets NODE_ENV=production for prod AND preview, so this throws
    // everywhere except local dev — a missing secret must fail loud, not
    // silently sign with a guessable default in production.
    if (process.env.NODE_ENV !== "development") {
      throw new Error("PITCH_LINK_SECRET (or ADMIN_JWT_SECRET) is required outside development");
    }
    return "playroom-pitch-secret-change-in-prod";
  })(),
);

const TYP = "pitch";
export const DEFAULT_EXPIRY_DAYS = 14;
export const MAX_EXPIRY_DAYS = 90;

export interface PitchToken {
  /** Operator name — rendered as the watermark. */
  operator: string;
  /** Admin email who generated the link (for the open log / audit). */
  sentBy: string;
}

/**
 * Mint a signed pitch link token. `days` is clamped to [1, MAX_EXPIRY_DAYS].
 * Server-only (needs the secret) — call from an admin-gated route.
 */
export async function signPitchToken(
  t: PitchToken,
  days: number = DEFAULT_EXPIRY_DAYS,
): Promise<string> {
  const d = Math.max(1, Math.min(MAX_EXPIRY_DAYS, Math.floor(days) || DEFAULT_EXPIRY_DAYS));
  return new SignJWT({ typ: TYP, op: t.operator, by: t.sentBy })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${d}d`)
    .sign(SECRET);
}

/** Verify a pitch link token. Returns null on missing / invalid / expired /
 *  wrong-type — the caller shows the "link invalid or expired" gate. */
export async function verifyPitchToken(token: string | null | undefined): Promise<PitchToken | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.typ !== TYP || typeof payload.op !== "string") return null;
    return { operator: payload.op, sentBy: typeof payload.by === "string" ? payload.by : "" };
  } catch {
    return null;
  }
}
