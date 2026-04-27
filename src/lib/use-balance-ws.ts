"use client";

import { useEffect, useRef, useCallback } from "react";
import { WS_BASE } from "./ws-config";
import { useGame, type RecentWinLine } from "./game-context";
import { sendToParent } from "./iframe-bridge";
import { betCodeLabel } from "./bet-codes";
import { dispatchReverseFlyToBalance } from "./chip-fly";
import { WIN_FLASH_DURATION_MS } from "@/components/player/WinFlash";

/** Max reconnection delay in ms. */
const MAX_DELAY = 30_000;

/** Backend `RoundSettled.data.winningBets[]` shape. */
interface SettledBetEntry {
  betCode: string;
  betAmount: number;
  payoff: number;
  won: boolean;
}

/**
 * Connects to the player balance WebSocket and keeps GameContext.balance in sync.
 * Reconnects automatically with exponential backoff.
 *
 * Also handles `RoundSettled` events: drives the YOU WON flash overlay and the
 * post-flash chip-back-to-balance reverse fly.
 */
export function useBalanceWs() {
  const {
    token,
    setBalance,
    setRecentWin,
    stackedChips,
    addFlyingChip,
    clearStackedChips,
  } = useGame();

  // Refs avoid stale closures inside ws.onmessage without forcing reconnects.
  const settersRef = useRef({
    setBalance,
    setRecentWin,
    stackedChips,
    addFlyingChip,
    clearStackedChips,
  });
  settersRef.current = {
    setBalance,
    setRecentWin,
    stackedChips,
    addFlyingChip,
    clearStackedChips,
  };

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const mountedRef = useRef(true);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!mountedRef.current || !token) return;

    const url = `${WS_BASE}/ws/balance/${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const s = settersRef.current;
        const type = msg.type as string | undefined;
        const data = (msg.data ?? msg) as Record<string, unknown>;

        // BalanceUpdate (or bare {balance: x})
        const balance =
          typeof msg.balance === "number"
            ? msg.balance
            : typeof data.balance === "number"
              ? data.balance
              : null;
        if (balance !== null) {
          s.setBalance(balance);
          sendToParent("balanceUpdate", { balance });
        }

        // RoundSettled — show YOU WON flash + reverse-fly the chips back.
        if (type === "RoundSettled") {
          const winningBets = (data.winningBets ?? []) as SettledBetEntry[];
          const winners = winningBets.filter((b) => b.won && b.payoff > 0);
          if (winners.length === 0) {
            // No win -> RoundClosed will clear the stacks normally.
            return;
          }

          const fightId = String(data.fightId ?? "");
          const totalPayoff = Number(data.totalPayoff ?? 0);
          // Consolidate per bet code so 5 separate Player bets of $200 each
          // render as ONE line "PLAYER +$1000" instead of 5 cluttered lines.
          const grouped = new Map<string, number>();
          for (const b of winners) {
            grouped.set(b.betCode, (grouped.get(b.betCode) ?? 0) + Number(b.payoff));
          }
          const lines: RecentWinLine[] = Array.from(grouped.entries()).map(
            ([betCode, amount]) => ({
              label: betCodeLabel(betCode),
              amount,
              betCode,
            }),
          );

          s.setRecentWin({ fightId, totalPayoff, lines });

          // After the flash duration: clear the win + dispatch the reverse fly.
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          flashTimerRef.current = setTimeout(() => {
            const cur = settersRef.current;
            cur.setRecentWin(null);
            const stacks = cur.stackedChips;
            // Snapshot the stacks, clear them, then fly ephemeral copies to
            // the balance area. Clearing first prevents the static stack
            // markers from overlapping the in-flight chips.
            cur.clearStackedChips();
            if (stacks && Object.keys(stacks).length > 0) {
              dispatchReverseFlyToBalance({
                stackedChips: stacks,
                addFlyingChip: cur.addFlyingChip,
              });
            }
          }, WIN_FLASH_DURATION_MS);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(1000 * 2 ** retryRef.current, MAX_DELAY);
    retryRef.current += 1;
    setTimeout(() => {
      if (mountedRef.current) connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [connect]);
}
