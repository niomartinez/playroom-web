"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "./game-context";
import { setIdleExempt } from "./idle-exempt";

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

// Fail-open ceiling: if the first mint hasn't returned within this long (no
// session, demo route, backend blip), let the video connect anyway — tokenless,
// like today. The authenticated fast path flips `ready` the instant the first
// token lands (~300ms), so this only ever delays the failure/demo case.
const READY_TIMEOUT_MS = 2_000;

export interface StreamTokenState {
  /** Freshest token; read at (re)connect time. Renewals update this in place
   *  without re-rendering, so a healthy WHEP session is never torn down. */
  tokenRef: React.MutableRefObject<string | null>;
  /** Flips true once the FIRST token is in hand (or the fail-open timeout
   *  elapses). Gate the video's initial connect on this so the stream carries
   *  a token from the very first handshake — otherwise the WHEP session is
   *  anonymous and the server can never kick it (freeloading). */
  ready: boolean;
}

export function useStreamToken(): StreamTokenState {
  const { gameId } = useGame();
  const tokenRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Fail-open backstop: never let a missing token block playback forever.
    const failOpen = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, READY_TIMEOUT_MS);

    if (!gameId) {
      tokenRef.current = null;
      return () => {
        cancelled = true;
        clearTimeout(failOpen);
      };
    }

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
        if (!cancelled && typeof token === "string") {
          tokenRef.current = token;
          setReady(true); // fast path: connect now, with a token in hand
        }
      } catch {
        // network blip — fail-open, retry on the next tick
      }
    };

    // Re-entry: mount = the player walking (back) into the table. Clears any
    // idle stream revoke server-side so a refresh restores video + betting —
    // then mint the first token. Rejoin failures fall through to a plain
    // mint; a still-revoked session just stays cut until the next refresh.
    const rejoinThenMint = async () => {
      try {
        const res = await fetch("/api/stream/rejoin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_id: gameId }),
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.data?.idle_exempt === true) setIdleExempt(true);
        }
      } catch {
        // best-effort — never block the token mint on rejoin
      }
      await mint();
    };

    rejoinThenMint();
    const id = setInterval(mint, RENEW_MS);
    return () => {
      cancelled = true;
      clearTimeout(failOpen);
      clearInterval(id);
    };
  }, [gameId]);

  return { tokenRef, ready };
}

/** Append the stream token as `?t=` / `&t=` to a stream URL, if present. */
export function withStreamToken(url: string, token: string | null): string {
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${encodeURIComponent(token)}`;
}
