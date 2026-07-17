"use client";

/**
 * How many consecutive no-bet rounds a player gets before the session
 * escalates, and how far it escalates.
 *
 * Configurable rather than hardcoded because this number is a product
 * decision that gets retuned, and because testing it costs a full round per
 * step — proving a 6-round ladder against a 25s round loop is two and a half
 * minutes of sitting on your hands, per attempt.
 *
 * Resolution order (first wins):
 *   1. URL params — `?idleExpire=6&idleWarn1=4&idleWarn2=5`
 *   2. Env — NEXT_PUBLIC_IDLE_EXPIRE / _WARN_1 / _WARN_2
 *   3. DEFAULT_IDLE_POLICY below
 *
 * The URL override is the one that matters for QA: it re-tunes a live
 * session with a reload, no redeploy. It is read-only and affects nothing
 * server-side — a player who sets `?idleExpire=999` only postpones their own
 * overlay, they don't gain a seat they'd otherwise lose. Idle removal isn't
 * enforced by the backend at all today, so this grants nothing that wasn't
 * already available by simply not loading our page.
 */
export interface IdlePolicy {
  /** Idle rounds before the amber warning. `null` disables it. */
  warn1: number | null;
  /** Idle rounds before the red final warning. `null` disables it. */
  warn2: number | null;
  /** Idle rounds before the frozen "Session Expired" overlay. */
  expire: number;
}

/**
 * Current rule: one missed round and you're out.
 *
 * Bet a round, skip the next, and the overlay lands as the round after that
 * opens. The warnings are off because there is nowhere to put them — at
 * `expire: 1` any warning would fire on the same round transition as the
 * freeze itself, which is just a freeze with extra steps.
 *
 * This replaces the original BOD ladder (warn 4 / final 5 / freeze 6). To get
 * that back for a demo, no deploy needed:
 *   /play?...&idleWarn1=4&idleWarn2=5&idleExpire=6
 */
export const DEFAULT_IDLE_POLICY: IdlePolicy = {
  warn1: null,
  warn2: null,
  expire: 1,
};

/** Parse a positive integer, or null if absent/junk. Never throws. */
function readInt(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function resolveIdlePolicy(search?: string): IdlePolicy {
  const qs =
    search ??
    (typeof window !== "undefined" ? window.location.search : "");
  const params = new URLSearchParams(qs);

  const expire =
    readInt(params.get("idleExpire")) ??
    readInt(process.env.NEXT_PUBLIC_IDLE_EXPIRE) ??
    DEFAULT_IDLE_POLICY.expire;

  // A warning at or past the freeze can never fire, so drop it rather than
  // leave a rung that silently does nothing.
  const clampWarn = (v: number | null): number | null =>
    v != null && v < expire ? v : null;

  const warn1 =
    clampWarn(
      readInt(params.get("idleWarn1")) ??
        readInt(process.env.NEXT_PUBLIC_IDLE_WARN_1) ??
        DEFAULT_IDLE_POLICY.warn1,
    );
  const warn2 =
    clampWarn(
      readInt(params.get("idleWarn2")) ??
        readInt(process.env.NEXT_PUBLIC_IDLE_WARN_2) ??
        DEFAULT_IDLE_POLICY.warn2,
    );

  return { warn1, warn2, expire };
}
