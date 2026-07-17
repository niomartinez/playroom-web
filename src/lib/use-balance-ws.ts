"use client";

import { useEffect, useRef, useCallback } from "react";
import { WS_BASE } from "./ws-config";
import { useGame, type RecentWinLine } from "./game-context";
import { holdMoveBalance, isBetMoveInFlight } from "./bet-move";
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
    setBalanceLoaded,
    setCurrency,
    setRecentWin,
    stackedChips,
    addFlyingChip,
    clearStackedChips,
    videoDelayMs,
  } = useGame();

  // Refs avoid stale closures inside ws.onmessage without forcing reconnects.
  const settersRef = useRef({
    setBalance,
    setBalanceLoaded,
    setCurrency,
    setRecentWin,
    stackedChips,
    addFlyingChip,
    clearStackedChips,
    videoDelayMs,
  });
  settersRef.current = {
    setBalance,
    setBalanceLoaded,
    setCurrency,
    setRecentWin,
    stackedChips,
    addFlyingChip,
    clearStackedChips,
    videoDelayMs,
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
        const reason = (msg.reason ?? data.reason) as string | undefined;

        // Video sync: settlement credits and the RoundSettled win-flash event
        // both correspond to "dealer announces the winner" on the live video.
        // Delay them by videoDelayMs so the balance crawl / YOU WON overlay
        // don't fire before the player sees the result on the stream.
        //
        // We deliberately do NOT delay reason === "debit" updates (bet placement
        // optimistic confirmations) or other balance changes (deposits etc.) —
        // those are unrelated to dealer actions on video.
        const isVideoSynced =
          type === "RoundSettled" || reason === "credit";
        const delay = s.videoDelayMs;
        if (isVideoSynced && delay > 0) {
          setTimeout(() => apply(msg, type, data, reason), delay);
        } else {
          apply(msg, type, data, reason);
        }
      } catch {
        // ignore malformed messages
      }
    };

    function apply(
      msg: Record<string, unknown>,
      type: string | undefined,
      data: Record<string, unknown>,
      reason: string | undefined,
    ) {
      try {
        const s = settersRef.current;

        // Currency: the backend sends "currency" on the "connected"
        // BalanceUpdate frame. Apply it whenever present so the money symbol
        // across the UI reflects the operator wallet. (Demo mode never sends
        // this frame, so the GameContext "PHP" default stands.)
        const currency =
          typeof msg.currency === "string"
            ? (msg.currency as string)
            : typeof data.currency === "string"
              ? (data.currency as string)
              : null;
        if (currency) {
          s.setCurrency(currency);
        }

        // BalanceUpdate (or bare {balance: x})
        const balance =
          typeof msg.balance === "number"
            ? (msg.balance as number)
            : typeof data.balance === "number"
              ? (data.balance as number)
              : null;
        if (balance !== null) {
          // A drag-to-move is net-zero, but the server reports it as a refund
          // of the source followed by a debit of the replacement. Applying
          // those as they land made a moved chip look like a win followed by
          // a fresh deduction (BalanceBar animates every change it sees).
          // Hold them and let the move apply the final one when it settles —
          // including on failure, where the refund IS the real balance.
          if (isBetMoveInFlight()) {
            holdMoveBalance(balance);
          } else if (reason === "debit") {
            // Avoid the "upward flicker" when the player rapid-fires bets:
            // each placeBet does an optimistic local debit, but the server
            // confirmations arrive one at a time. A WS push for bet 1's
            // post-debit balance would otherwise overwrite local state
            // that has already optimistically debited bets 2 and 3, causing
            // the displayed balance to jump up before crawling back down.
            s.setBalance((current) => Math.min(current, balance));
          } else {
            // Every other reason (initial "connected" snapshot, settlement
            // credit/push, void refund, operator deposit/withdraw, future
            // unknown reasons) is server-driven and authoritative. Apply
            // those directly. Default-apply for unknown reasons keeps us
            // from accidentally clamping a future server-side update we
            // forgot to enumerate.
            s.setBalance(balance);
          }
          // The wallet has now spoken, so `balance` is authoritative rather
          // than the initial 0 (see #4 / LowBalanceGate).
          s.setBalanceLoaded(true);
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
