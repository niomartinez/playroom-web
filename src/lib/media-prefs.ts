"use client";

/**
 * Shared player media preferences for the live video stream audio, so the
 * in-video controls (VideoPlayer) and the Sound & Video menu panel stay in
 * sync. Backed by localStorage; a window event notifies every listener to
 * re-read on change. Also carries a "reload stream" signal.
 */

export const VOLUME_KEY = "prg_player_volume";
export const MUTED_KEY = "prg_player_muted";
const CHANGE_EVT = "prg:media-prefs";
const RELOAD_EVT = "prg:video-reload";

/** Persisted stream volume, 0..1 (defaults to 1). */
export function getVolume(): number {
  if (typeof window === "undefined") return 1;
  const v = Number(window.localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 1;
}

/**
 * Persisted mute state. Defaults to muted until the player explicitly
 * unmutes — browser autoplay policy rejects unmuted autoplay without a
 * user gesture.
 */
export function getMuted(): boolean {
  if (typeof window === "undefined") return true;
  const m = window.localStorage.getItem(MUTED_KEY);
  return m === null ? true : m === "true";
}

export function setVolumePref(v: number): void {
  if (typeof window === "undefined") return;
  const clamped = Math.min(1, Math.max(0, v));
  window.localStorage.setItem(VOLUME_KEY, String(clamped));
  window.dispatchEvent(new Event(CHANGE_EVT));
}

export function setMutedPref(m: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTED_KEY, String(m));
  window.dispatchEvent(new Event(CHANGE_EVT));
}

/** Subscribe to volume/mute changes. Returns an unsubscribe fn. */
export function subscribeMedia(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVT, cb);
  return () => window.removeEventListener(CHANGE_EVT, cb);
}

/** Ask the video player to reconnect the stream. */
export function requestVideoReload(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RELOAD_EVT));
}

export function onVideoReload(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(RELOAD_EVT, cb);
  return () => window.removeEventListener(RELOAD_EVT, cb);
}
