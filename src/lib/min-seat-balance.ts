"use client";

import { API_BASE } from "./ws-config";
import { urlOverrideAllowed } from "./idle-policy";

/**
 * Minimum wallet balance a player must keep to hold their seat.
 *
 * SOURCE OF TRUTH IS THE SERVER. The backend sends `min_seat_balance` in table
 * state (from system_config, see backend config_cache.get_min_seat_balance).
 * The client must not decide its own enforcement thresholds — a value the
 * player controls can be bypassed.
 *
 * Semantics:
 *   - **block** the seat when `balance < block` (SeatBalanceGate takes over).
 *   - **warn**  when `block <= balance < warn` (BalanceBar pulses red).
 *
 * The `?seatBlock=…&seatWarn=…` URL override exists ONLY for QA and is honoured
 * ONLY off-production (staging / localhost). In production the URL is ignored
 * outright, so a player cannot lower their own seat floor by editing the
 * address bar. Fail-closed: anything that isn't clearly a non-prod API host is
 * treated as prod. (Mirrors idle-policy.ts.)
 */
export interface MinSeatBalance {
  /** Seat is blocked below this wallet balance. */
  block: number;
  /** Amber warning zone floor (>= block). */
  warn: number;
}

/**
 * Last-resort default, used only if the server sends nothing (e.g. a demo
 * table). Mirrors the backend default so the two never silently disagree.
 */
export const DEFAULT_MIN_SEAT_BALANCE: MinSeatBalance = {
  block: 1000,
  warn: 2000,
};

/** Parse a non-negative number, or null if absent/junk. Never throws. */
function readNum(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function clamp(p: MinSeatBalance): MinSeatBalance {
  // A warn threshold at or below the block can never fire — pin it to block so
  // the warning zone is simply empty rather than inverted.
  const warn = p.warn >= p.block ? p.warn : p.block;
  return { block: p.block, warn };
}

/**
 * Resolve the effective seat-balance thresholds.
 *
 * @param server  what table state delivered (the authority), or null.
 * @param search  location.search, for the QA override (off-prod only).
 */
export function resolveMinSeatBalance(
  server?: Partial<MinSeatBalance> | null,
  search?: string,
): MinSeatBalance {
  // Base = server value, falling back field-by-field to the default.
  const base: MinSeatBalance = {
    block: server?.block ?? DEFAULT_MIN_SEAT_BALANCE.block,
    warn: server?.warn ?? DEFAULT_MIN_SEAT_BALANCE.warn,
  };

  if (!urlOverrideAllowed(API_BASE)) {
    // Production: the address bar cannot touch this.
    return clamp(base);
  }

  const qs =
    search ?? (typeof window !== "undefined" ? window.location.search : "");
  const params = new URLSearchParams(qs);
  const block = readNum(params.get("seatBlock")) ?? base.block;
  const warn = readNum(params.get("seatWarn")) ?? base.warn;
  return clamp({ block, warn });
}
