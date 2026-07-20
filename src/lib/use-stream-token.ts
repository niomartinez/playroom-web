"use client";

import { useEffect, useRef } from "react";
import { useGame } from "./game-context";

/**
 * Mints + renews the player's short-lived stream-access token for the current
 * table, and (as a deliberate side effect) heartbeats presence so the backend's
 * per-round idle tracking can see this session.
 *
 * Returns a ref holding the latest token (or null). It is intentionally a ref,
 * not state: the token is read when a stream connection is (re)built, and a
 * silent 60s renewal must NOT re-render the video component or it would tear
 * down a healthy WHEP connection every minute. WHEP authorizes once at the
 * handshake; revocation is enforced out-of-band by the VPS shim (kick), so the
 * live connection never needs to re-handshake just because the token rotated.
 *
 * Fully fail-open on the client: if the mint fails (no session, backend blip,
 * demo route) the ref stays null and callers fall back to the bare stream URL —
 * exactly today's behavior. The token only ever *adds* access once the VPS
 * authz shim is live; it never gates playback here.
 */

// Comfortably shorter than the 90s server TTL so a token is always fresh, and
// frequent enough to keep the presence window (150s) alive across a dropped
// request.
const RENEW_MS = 60_000;

export function useStreamToken(): React.MutableRefObject<string | null> {
  const { gameId } = useGame();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      tokenRef.current = null;
      return;
    }
    let cancelled = false;

    const mint = async () => {
      try {
        const res = await fetch("/api/stream/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_id: gameId }),
        });
        if (!res.ok) return; // fail-open: keep whatever token we had
        const json = await res.json();
        const token = json?.data?.stream_token ?? null;
        if (!cancelled && typeof token === "string") tokenRef.current = token;
      } catch {
        // network blip — fail-open, retry on the next tick
      }
    };

    mint();
    const id = setInterval(mint, RENEW_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [gameId]);

  return tokenRef;
}

/** Append the stream token as `?t=` / `&t=` to a stream URL, if present. */
export function withStreamToken(url: string, token: string | null): string {
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${encodeURIComponent(token)}`;
}
