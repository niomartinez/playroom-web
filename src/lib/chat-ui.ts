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
