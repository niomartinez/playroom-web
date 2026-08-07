/**
 * Break-glass: reach /admin or /studio from an IP that is not on the allowlist.
 *
 * The allowlist cannot follow a person. Mobile data, a VPN exit, a hotel, a
 * rotated home connection — on this account one machine moved 175.176.33.x ->
 * .34.x -> .41.x -> .58.x, and each move was a lockout that only someone
 * ALREADY inside could clear. The alternative to this file is whitelisting a
 * carrier's whole subscriber pool, which admits thousands of strangers'
 * addresses to buy back one person's access. A secret only we hold is the
 * better trade: it moves with the person and grants nothing to anyone else.
 *
 * What it is NOT: a way in. Passing the gate only reaches the LOGIN page —
 * password, role and session checks are all still in front of everything. This
 * replaces "which network are you on", not "who are you".
 *
 * Shape:
 *   1. POST the code to /api/admin/unlock (a form, so the secret never lands in
 *      a URL, browser history, referrer header or an access log).
 *   2. That route verifies it, records an audit row, and sets a short-lived
 *      signed cookie.
 *   3. The gate accepts that cookie in place of an allowlisted IP.
 *
 * Inert unless BREAK_GLASS_CODE is set: no env var, no bypass, and the unlock
 * page says so rather than pretending to work.
 */
import { SignJWT, jwtVerify } from "jose";

/** One shift. Long enough to fix the allowlist properly, short enough that a
 *  borrowed laptop does not stay unlocked. */
export const BYPASS_TTL_SECONDS = 8 * 60 * 60;

export const BYPASS_COOKIE = "panel_bypass";

/** Minimum code length. Brute force is the only attack this has to survive, so
 *  entropy is the whole defence — a short code would make the gate weaker than
 *  no gate, because it would look like protection. */
export const MIN_CODE_LENGTH = 24;

/**
 * Compare in time independent of where the first difference falls.
 *
 * A plain `===` returns as soon as two bytes differ, and that timing is enough
 * to recover a secret character by character over enough requests.
 */
export function safeEqual(a: string, b: string): boolean {
  // Length is not secret (and JS string comparison would leak it anyway), but
  // the loop must still run over a fixed span for the equal-length case.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** The configured code, or null when the feature is switched off. */
export function configuredCode(): string | null {
  const code = process.env.BREAK_GLASS_CODE?.trim();
  if (!code) return null;
  if (code.length < MIN_CODE_LENGTH) {
    // Refuse to honour a weak code rather than silently accept it: a 6-digit
    // BREAK_GLASS_CODE would be guessable and would sit there looking configured.
    console.error(
      `[break-glass] BREAK_GLASS_CODE is shorter than ${MIN_CODE_LENGTH} chars — ` +
        "ignoring it. Set a long random value or unset it.",
    );
    return null;
  }
  return code;
}

export function isEnabled(): boolean {
  return configuredCode() !== null;
}

/** True when `submitted` is the configured code. False when disabled. */
export function verifyCode(submitted: string | null | undefined): boolean {
  const code = configuredCode();
  if (!code || !submitted) return false;
  return safeEqual(submitted, code);
}

function signingKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Mint the cookie value: a JWT bound to the granting IP and an expiry.
 *
 * The IP is inside the signature so a stolen cookie cannot be replayed from
 * somewhere else — it stops being a portable credential the moment it leaves
 * the machine that unlocked. That is deliberately stricter than it sounds: a
 * rotation mid-session simply means unlocking again, which costs one form.
 */
export async function mintBypass(
  secret: string,
  ip: string,
): Promise<string> {
  return await new SignJWT({ ip, kind: "break-glass" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${BYPASS_TTL_SECONDS}s`)
    .sign(signingKey(secret));
}

/** True when `token` is a valid, unexpired bypass minted for `ip`. */
export async function verifyBypass(
  secret: string,
  token: string | null | undefined,
  ip: string | null | undefined,
): Promise<boolean> {
  if (!token || !ip) return false;
  try {
    const { payload } = await jwtVerify(token, signingKey(secret));
    return payload.kind === "break-glass" && payload.ip === ip;
  } catch {
    // Expired, wrong signature, malformed — all the same answer.
    return false;
  }
}
