"use client";

import { useEffect, useRef, useCallback } from "react";
import { WS_BASE } from "./ws-config";
import { useGame } from "./game-context";
import { sendToParent } from "./iframe-bridge";

/** Max reconnection delay in ms. */
const MAX_DELAY = 30_000;

/**
 * Connects to the player balance WebSocket and keeps GameContext.balance in sync.
 * Reconnects automatically with exponential backoff.
 */
export function useBalanceWs() {
  const { token, setBalance } = useGame();

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const mountedRef = useRef(true);

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
        const balance =
          typeof msg.balance === "number"
            ? msg.balance
            : typeof msg.data?.balance === "number"
              ? msg.data.balance
              : null;

        if (balance !== null) {
          setBalance(balance);
          sendToParent("balanceUpdate", { balance });
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
  }, [token, setBalance]);

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
    };
  }, [connect]);
}
