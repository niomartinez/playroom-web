/**
 * Shared, framework-free constants and helpers for the live-chat UIs
 * (desktop `LiveChat` and mobile `MobileChat`). Kept dependency-free so both
 * surfaces render an identical look with a single source of truth.
 */

/** localStorage key for the persisted chat panel opacity. */
export const OPACITY_KEY = "prg_chat_opacity";
export const DEFAULT_OPACITY = 0.2;
export const MIN_OPACITY = 0.2;
export const MAX_OPACITY = 1.0;

/** Client-side send cooldown (mirrors the server's 1 msg / 5s rule for UX). */
export const SEND_COOLDOWN_MS = 5000;

/**
 * Max chat message length — mirrors the server cap (MAX_MESSAGE_LENGTH in
 * backend app/api/ws_chat.py). Tightened 200 → 100 on 2026-07-22 after
 * wall-of-text spam; keep both in sync.
 */
export const MAX_CHAT_LENGTH = 100;

/** Curated emoji set for the picker — no external deps, CSP-safe. */
export const EMOJIS = [
  "😀","😂","😅","😉","😍","😎","🤑","😭","😡","🤔",
  "👍","👎","👏","🙏","💪","🔥","💯","🎉","✨","💰",
  "🃏","🎰","🍀","💵","💸","⚡","❤️","💔","👀","🤝",
  "😱","🥳","😴","🤮","🤡","👑","🚀","⭐","✅","❌",
];

/** Clamp an arbitrary number into the allowed opacity range. */
export function clampOpacity(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_OPACITY;
  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, v));
}

/** Format the time component of an ISO string into a compact 24h "HH:MM". */
export function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

/**
 * Format an ISO string into a FULL local timestamp "YYYY-MM-DD HH:MM:SS"
 * (24h). Used by the studio chat-monitor view where operators need the
 * absolute date + seconds of every line, not the compact HH:MM shown to
 * players. Falls back to the raw input on parse failure.
 */
export function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    // Invalid dates don't throw; toLocale* would render "Invalid Date". Guard
    // explicitly so a malformed `time` falls back to the raw input.
    if (Number.isNaN(d.getTime())) return iso || "";
    const date = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return `${date} ${time}`;
  } catch {
    return iso || "";
  }
}
