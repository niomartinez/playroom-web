"use client";

import { API_BASE } from "./ws-config";

/**
 * How many consecutive no-bet rounds a player gets before the session
 * escalates, and how far it escalates.
 *
 * SOURCE OF TRUTH IS THE SERVER. The backend sends `idle_policy` in table
 * state (from system_config, see backend config_cache.get_idle_policy). The
 * client must not decide its own enforcement thresholds — a value the player
 * controls can be bypassed.
 *
 * The `?idleExpire=…&idleWarn1=…&idleWarn2=…` URL override exists ONLY for QA
 * and is honoured ONLY off-production (staging / localhost). In production the
 * URL is ignored outright, so a player cannot lengthen or disable their own
 * idle freeze by editing the address bar. Fail-closed: anything that isn't
 * clearly a non-prod API host is treated as prod.
 *
 * (Reminder: idle removal is a client-side UX behaviour today — it blocks the
 * player's own view. It is NOT server-enforced, so it frees no seat and stops
 * no payout on its own. Real enforcement would be a backend feature.)
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
 * Last-resort default, used only if the server sends nothing (e.g. a demo
 * table). Mirrors the backend default so the two never silently disagree.
 */
export const DEFAULT_IDLE_POLICY: IdlePolicy = {
  warn1: null,
  warn2: null,
  expire: 1,
};

/** Whether the QA URL override is allowed — non-prod API hosts only. */
export function urlOverrideAllowed(apiBase: string = API_BASE): boolean {
  // Explicit allow-list, fail-closed. Only staging / preview / local dev.
  return /staging|localhost|127\.0\.0\.1|\bpreview\b/i.test(apiBase);
}

/** Parse a positive integer, or null if absent/junk. Never throws. */
function readInt(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function clamp(p: IdlePolicy): IdlePolicy {
  // A warning at or past the freeze can never fire — drop it.
  const warn1 = p.warn1 != null && p.warn1 < p.expire ? p.warn1 : null;
  const warn2 = p.warn2 != null && p.warn2 < p.expire ? p.warn2 : null;
  return { warn1, warn2, expire: p.expire };
}

/**
 * Resolve the effective policy.
 *
 * @param serverPolicy  what table state delivered (the authority), or null.
 * @param search        location.search, for the QA override (off-prod only).
 */
export function resolveIdlePolicy(
  serverPolicy?: Partial<IdlePolicy> | null,
  search?: string,
): IdlePolicy {
  // Base = server value, falling back field-by-field to the default.
  const base: IdlePolicy = {
    expire: serverPolicy?.expire ?? DEFAULT_IDLE_POLICY.expire,
    warn1: serverPolicy?.warn1 ?? DEFAULT_IDLE_POLICY.warn1,
    warn2: serverPolicy?.warn2 ?? DEFAULT_IDLE_POLICY.warn2,
  };

  if (!urlOverrideAllowed()) {
    // Production: the address bar cannot touch this.
    return clamp(base);
  }

  const qs =
    search ?? (typeof window !== "undefined" ? window.location.search : "");
  const params = new URLSearchParams(qs);
  const expire = readInt(params.get("idleExpire")) ?? base.expire;
  const warn1 = params.has("idleWarn1") ? readInt(params.get("idleWarn1")) : base.warn1;
  const warn2 = params.has("idleWarn2") ? readInt(params.get("idleWarn2")) : base.warn2;
  return clamp({ expire, warn1, warn2 });
}
