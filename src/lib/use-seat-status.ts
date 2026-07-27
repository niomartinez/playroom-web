"use client";

import { useEffect, useRef } from "react";
import { useGame } from "./game-context";
import type { SeatDecision } from "./seat-status";

/**
 * Keeps the server's seat decision current for an already-mounted client.
 *
 * Two jobs, deliberately different cadences:
 *
 *  - The SSR bootstrap came back `unknown` (the Vercel->Render call timed out).
 *    Poll hard until ANY authoritative answer lands, because until then the
 *    player is sitting behind SeatCheckOverlay.
 *  - The bootstrap resolved. Refresh slowly — the decision is re-derived from
 *    the live balance locally, so the only thing a refresh buys is `seated`
 *    flipping true after the player's first bet, and `enforced` following an
 *    operator wallet-mode change. Neither is urgent.
 *
 * This is a BACKSTOP, not the mechanism. The gate lifts the instant
 * `resolveSeatGate` can answer from any source — including the balance WS and
 * table state alone, exactly as it did before — so a client that never gets a
 * seat response still recovers.
 */

const RETRY_MS = 2000;
const REFRESH_MS = 60000;

export function useSeatStatus() {
  const { token, gameId, seat, setSeat } = useGame();
  // Read through a ref so the polling effect doesn't tear down and restart
  // every time an answer arrives.
  const statusRef = useRef(seat.status);
  statusRef.current = seat.status;

  useEffect(() => {
    if (!gameId || !token || token === "demo") return;
    if (seat.status === "skipped") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/me/seat?game_id=${encodeURIComponent(gameId)}`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as {
          error_code?: string;
          data?: { seat?: SeatDecision };
        } | null;
        if (cancelled) return;
        if (res.ok && json?.error_code === "0" && json.data?.seat) {
          const decision = json.data.seat;
          setSeat(decision.blocked ? { status: "blocked", seat: decision } : { status: "ok", seat: decision });
          attempt = 0;
        } else {
          attempt += 1;
        }
      } catch {
        if (cancelled) return;
        attempt += 1;
      }
      schedule();
    };

    const schedule = () => {
      if (cancelled) return;
      // Unresolved is the urgent case; back off (with jitter) so a backend that
      // is genuinely down isn't hammered by every open table.
      const base =
        statusRef.current === "unknown"
          ? Math.min(RETRY_MS * 2 ** Math.min(attempt, 4), 30000)
          : REFRESH_MS;
      timer = setTimeout(tick, base + Math.random() * 500);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // Only the identity of the session/table restarts the loop; `seat.status`
    // is read through the ref above so an answer landing doesn't churn it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, token, setSeat]);
}
