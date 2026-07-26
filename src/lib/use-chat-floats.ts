"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./use-chat-ws";

export interface FloatMsg {
  key: string;
  user: string;
  text: string;
  /** True once the hold has elapsed and the bubble is fading out. */
  fading: boolean;
}

/**
 * Recent chat lines shown as transient bubbles over the feed.
 *
 * Timing, and why this is a QUEUE rather than a plain list:
 *
 *   HOLD_MS   the bubble sits fully opaque — long enough to actually read.
 *   FADE_MS   it then fades out over this long.
 *
 * A slot frees only once a bubble has COMPLETELY gone, and the next queued
 * message takes it. So messages never pop in on top of each other, and a busy
 * table drains at a readable pace instead of flashing past.
 *
 * At most {@link MAX_VISIBLE} bubbles are on screen; anything beyond waits its
 * turn. The queue is unbounded in principle but drains one slot per
 * (HOLD + FADE), so a flood is paced rather than dropped.
 *
 * Seen messages are tracked by a Set of ids — NOT an index into `messages`,
 * which is capped at 100 and replaced wholesale on reconnect, which would
 * pin/shrink an index watermark and silently kill floats mid-session.
 *
 * `myName` excludes your own lines when set (the mobile sheet does that, since
 * it shows them in its transcript anyway). Desktop passes null so you see your
 * own message land — with no panel there, that IS the confirmation it sent.
 */
const MAX_VISIBLE = 10;
const HOLD_MS = 5000;
const FADE_MS = 3000;
const TICK_MS = 250;

/** Exported so the bubble's CSS transition matches the hook's timing exactly. */
export const FLOAT_FADE_MS = FADE_MS;

interface Pending {
  key: string;
  user: string;
  text: string;
}

interface Live extends Pending {
  shownAt: number;
}

export function useChatFloats(
  messages: ChatMessage[],
  minimized: boolean,
  myName: string | null,
  historyLoaded: boolean,
): FloatMsg[] {
  const [, forceTick] = useState(0);
  const liveRef = useRef<Live[]>([]);
  const queueRef = useRef<Pending[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);

  // Mark the initial history as already-seen so joining a busy table doesn't
  // dump backlog over the feed.
  //
  // Keyed on `historyLoaded` — the server's history frame having ARRIVED — not
  // on `messages.length > 0`. On a table with an EMPTY history the old test
  // never became true, so hydration never completed and NOTHING ever floated:
  // not other players' lines, not even your own. An empty history is
  // indistinguishable from "history hasn't arrived yet" by length alone, which
  // is exactly why the explicit flag exists.
  useEffect(() => {
    if (!hydratedRef.current && historyLoaded) {
      hydratedRef.current = true;
      for (const m of messages) seenRef.current.add(m.id);
      forceTick((n) => n + 1);
    }
  }, [messages, historyLoaded]);

  // Enqueue anything new.
  useEffect(() => {
    if (!hydratedRef.current) return;

    if (!minimized) {
      // Panel is open (mobile sheet) — the transcript is right there, so nothing
      // should float. Treat everything as seen and clear the screen.
      liveRef.current = [];
      queueRef.current = [];
      for (const m of messages) seenRef.current.add(m.id);
      forceTick((n) => n + 1);
      return;
    }

    const fresh = messages.filter((m) => !seenRef.current.has(m.id));
    if (fresh.length === 0) return;
    for (const m of fresh) seenRef.current.add(m.id);

    const incoming = myName ? fresh.filter((m) => m.user !== myName) : fresh;
    if (incoming.length === 0) return;

    queueRef.current.push(
      ...incoming.map((m) => ({ key: m.id, user: m.user, text: m.text })),
    );
    forceTick((n) => n + 1);
  }, [messages, minimized, myName]);

  // Retire finished bubbles, then promote queued ones into the freed slots.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const before = liveRef.current.length;

      // Gone only after it has FULLY faded — that is what frees the slot.
      liveRef.current = liveRef.current.filter(
        (f) => now - f.shownAt < HOLD_MS + FADE_MS,
      );

      let promoted = 0;
      while (liveRef.current.length < MAX_VISIBLE && queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        liveRef.current.push({ ...next, shownAt: now });
        promoted++;
      }

      // Re-render when slots change, and while anything is mid-fade so the
      // `fading` flag flips at the right moment.
      const anyFading = liveRef.current.some((f) => now - f.shownAt >= HOLD_MS);
      if (before !== liveRef.current.length || promoted > 0 || anyFading) {
        forceTick((n) => n + 1);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  return liveRef.current.map((f) => ({
    key: f.key,
    user: f.user,
    text: f.text,
    fading: now - f.shownAt >= HOLD_MS,
  }));
}
