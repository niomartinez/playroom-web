"use client";

import { useEffect, useRef, useState } from "react";
import { WS_BASE } from "./ws-config";
import { fetchLobbyTicket } from "./lobby-ticket";
import type { ChatMessage } from "./use-chat-ws";

export interface UseStudioChatMonitorResult {
  messages: ChatMessage[];
  presence: number;
  connected: boolean;
}

/**
 * Read-only studio chat monitor for a single table (C4).
 *
 * Given a `tableId` (the table's external_game_id — the same key the player
 * chat WS and `chat_messages` rows use), it:
 *   1. Seeds from the REST history proxy (`/api/studio/chat/{tableId}/history`)
 *      so lines appear immediately even before the WS opens.
 *   2. Opens the monitor WS `${WS_BASE}/ws/chat-monitor/{tableId}?ticket=`,
 *      minting a single-use ticket with `fetchLobbyTicket({ role: "studio" })`.
 *
 * Reconnect/backoff mirrors `use-chat-ws.ts`. Passing a new `tableId` tears
 * down the old WS before opening the new one (effect cleanup + re-run), and
 * resets the buffers so tables never interleave. Observers never send frames
 * (read-only) and are not counted toward presence.
 */
const MAX_DELAY = 30_000;

export function useStudioChatMonitor(
  tableId: string | null,
): UseStudioChatMonitorResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presence, setPresence] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  // Once the WS `history` frame lands it is the fresher source; a late REST
  // seed (it can resolve after the WS opens) must not clobber it.
  const wsHistoryAppliedRef = useRef(false);

  useEffect(() => {
    // Reset buffers whenever the table changes (or clears) so the previous
    // table's lines never bleed into the new one.
    setMessages([]);
    setPresence(0);
    setConnected(false);
    wsHistoryAppliedRef.current = false;

    if (!tableId) return;

    let mounted = true;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    // 1) Seed from REST history (newest-first → render oldest→newest). The
    //    WS `history` frame backfills/replaces this on connect.
    (async () => {
      try {
        const res = await fetch(
          `/api/studio/chat/${encodeURIComponent(tableId)}/history?limit=200`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const json = await res.json();
        const list = (json?.data?.messages ?? []) as ChatMessage[];
        // Drop the seed if the WS history frame already applied (it wins).
        if (!mounted || wsHistoryAppliedRef.current) return;
        setMessages([...list].reverse());
      } catch {
        // ignore — the WS `history` frame will backfill on connect
      }
    })();

    const connect = async () => {
      if (!mounted) return;

      // Mint a fresh single-use ticket on every (re)connect. role:"studio"
      // forces the studio-cookie path (a stale player cookie in the same
      // browser must not win the auto-detect). Any failure just backs off:
      // this is a passive read surface, so we keep retrying rather than
      // freezing the view.
      const result = await fetchLobbyTicket({ role: "studio" });
      if (!mounted) return;
      if ("error" in result) {
        const delay = Math.min(1000 * 2 ** retry, MAX_DELAY);
        retry += 1;
        retryTimer = setTimeout(connect, delay);
        return;
      }

      const url = `${WS_BASE}/ws/chat-monitor/${encodeURIComponent(
        tableId,
      )}?ticket=${encodeURIComponent(result.ticket)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retry = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type as string | undefined;
          const data = msg.data ?? {};
          if (type === "history") {
            // Server sends oldest→newest; render as-is. Mark applied so a
            // late REST seed can't overwrite this fresher snapshot.
            wsHistoryAppliedRef.current = true;
            setMessages((data.messages ?? []) as ChatMessage[]);
          } else if (type === "presence") {
            setPresence(Number(data.count) || 0);
          } else if (type === "message") {
            setMessages((prev) => {
              const next = [...prev, data as ChatMessage];
              // Cap client-side to keep the DOM lean.
              return next.length > 200 ? next.slice(-200) : next;
            });
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
  }, [tableId]);

  return { messages, presence, connected };
}
