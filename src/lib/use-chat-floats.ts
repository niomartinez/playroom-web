"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./use-chat-ws";

export interface FloatMsg {
  key: string;
  user: string;
  text: string;
  expires: number;
}

/** Newly-arrived chat lines shown as transient bubbles over the feed while the
 *  chat panel is minimized. The last {@link MAX} float; each fades after
 *  {@link TTL_MS}. Shared by the mobile sheet and the desktop panel.
 *
 *  Seen messages are tracked by a Set of ids — NOT an index into `messages`,
 *  which is capped at 100 and replaced wholesale on reconnect, which would
 *  pin/shrink an index watermark and silently kill floats mid-session.
 *
 *  Own messages are excluded (best-effort by name — the only signal the wire
 *  gives). Nothing floats until the initial history is marked seen, so joining
 *  a busy table doesn't dump backlog over the feed.
 */
const MAX = 3;
const TTL_MS = 5000;

export function useChatFloats(
  messages: ChatMessage[],
  minimized: boolean,
  myName: string | null,
): FloatMsg[] {
  const [floats, setFloats] = useState<FloatMsg[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);

  // Mark the first batch (history) as already-seen; don't float backlog.
  useEffect(() => {
    if (!hydratedRef.current && messages.length > 0) {
      hydratedRef.current = true;
      for (const m of messages) seenRef.current.add(m.id);
    }
  }, [messages]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!minimized) {
      // Panel is open — clear floats and treat everything as seen.
      setFloats([]);
      for (const m of messages) seenRef.current.add(m.id);
      return;
    }
    const fresh = messages.filter((m) => !seenRef.current.has(m.id));
    if (fresh.length === 0) return;
    for (const m of fresh) seenRef.current.add(m.id);
    const incoming = myName ? fresh.filter((m) => m.user !== myName) : fresh;
    if (incoming.length === 0) return;
    const now = Date.now();
    setFloats((prev) =>
      [...prev, ...incoming.map((m) => ({ key: m.id, user: m.user, text: m.text, expires: now + TTL_MS }))].slice(-MAX),
    );
  }, [messages, minimized, myName]);

  // Prune expired bubbles.
  useEffect(() => {
    if (floats.length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setFloats((prev) => (prev.some((f) => f.expires <= now) ? prev.filter((f) => f.expires > now) : prev));
    }, 500);
    return () => clearInterval(id);
  }, [floats.length]);

  return floats;
}
