"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "./game-context";
import { WS_BASE } from "./ws-config";

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  /** Locally-generated notice shown only to this player; never broadcast. */
  system?: boolean;
}

interface UseChatWsResult {
  messages: ChatMessage[];
  presence: number;
  connected: boolean;
  send: (text: string) => void;
  lastError: string | null;
  /** True once the server's initial `history` payload has been received. */
  historyLoaded: boolean;
}

/**
 * Per-table chat WebSocket. Auto-reconnects with exponential backoff.
 *
 * Wire: `${WS_BASE}/ws/chat/${tableId}/${session_token}`.
 * Server emits `history` on connect, `presence` on join/leave,
 * `message` per chat line, `error` on validation / rate-limit fail.
 */
const MAX_DELAY = 30_000;

export function useChatWs(): UseChatWsResult {
  const { token, gameId } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presence, setPresence] = useState(0);
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token || token === "demo" || !gameId) return;

    setHistoryLoaded(false);
    let mounted = true;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!mounted) return;
      const url = `${WS_BASE}/ws/chat/${encodeURIComponent(gameId)}/${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retry = 0;
        setConnected(true);
        setLastError(null);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type as string | undefined;
          const data = msg.data ?? {};
          if (type === "history") {
            const list = (data.messages ?? []) as ChatMessage[];
            setMessages(list);
            setHistoryLoaded(true);
          } else if (type === "presence") {
            setPresence(Number(data.count) || 0);
          } else if (type === "message") {
            setMessages((prev) => {
              const next = [...prev, data as ChatMessage];
              // Cap to last 100 client-side to keep DOM lean.
              return next.length > 100 ? next.slice(-100) : next;
            });
          } else if (type === "error") {
            const text = String(data.message ?? "Chat error");
            if (data.code === "min_wager") {
              // The wager gate gets a SYSTEM LINE in the transcript rather than
              // a toast that vanishes in 4 seconds: it tells the player what to
              // do, and they should still be able to read it after looking away.
              // The server sent this on our socket only, so no one else sees it.
              setMessages((prev) => {
                const next = [
                  ...prev,
                  {
                    id: `sys-${Date.now()}`,
                    user: "System",
                    text,
                    time: new Date().toISOString(),
                    system: true,
                  } as ChatMessage,
                ];
                return next.length > 100 ? next.slice(-100) : next;
              });
              return;
            }
            setLastError(text);
            // auto-clear after 4s
            setTimeout(() => setLastError(null), 4000);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        setConnected(false);
        const delay = Math.min(1000 * 2 ** retry, MAX_DELAY);
        retry += 1;
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [token, gameId]);

  const send = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLastError("Chat not connected — please wait");
      setTimeout(() => setLastError(null), 4000);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    ws.send(JSON.stringify({ text: trimmed }));
  }, []);

  return { messages, presence, connected, send, lastError, historyLoaded };
}
