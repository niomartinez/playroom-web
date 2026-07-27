"use client";

import {
  useState,
  useRef,
  useEffect,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useChatFloats, FLOAT_FADE_MS } from "@/lib/use-chat-floats";
import { useChatWs } from "@/lib/use-chat-ws";
import { VISIBLE_BOTTOM_INSET } from "@/lib/use-visible-height";
import { useT, type TFunction } from "@/lib/i18n";
import {
  clampOpacity,
  fmtTime,
  OPACITY_KEY,
  DEFAULT_OPACITY,
  MIN_OPACITY,
  MAX_OPACITY,
  MAX_CHAT_LENGTH,
  SEND_COOLDOWN_MS,
} from "@/lib/chat-ui";

/** Fraction of the visible viewport the sheet occupies in its half state. */
const HALF_RATIO = 0.52;
/** Upward drag (px) past which the sheet snaps to full screen. */
const EXPAND_THRESHOLD = 48;
/** Downward drag (px) past which the sheet collapses (full→half) or closes. */
const COLLAPSE_THRESHOLD = 90;

/**
 * Keyframes for the floating button: a subtle wiggle each time a new message
 * arrives while the sheet is closed, plus a badge pop and a spawn animation.
 */
const STYLES = `
@keyframes prgChatWiggle {
  0%, 100% { transform: rotate(0deg); }
  12% { transform: rotate(-14deg); }
  26% { transform: rotate(11deg); }
  40% { transform: rotate(-8deg); }
  54% { transform: rotate(6deg); }
  68% { transform: rotate(-3deg); }
  82% { transform: rotate(1deg); }
}
@keyframes prgChatBadgePop {
  0% { transform: scale(0.4); opacity: 0; }
  60% { transform: scale(1.18); }
  100% { transform: scale(1); opacity: 1; }
}
.prg-chat-badge { animation: prgChatBadgePop 0.25s ease-out; }
@keyframes prgChatFabIn {
  from { transform: translateY(14px) scale(0.9); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
.prg-chat-fab-in { animation: prgChatFabIn 0.22s ease-out; }
@keyframes prgFloatMsg {
  0% { opacity: 0; transform: translateY(10px) scale(0.98); }
  8% { opacity: 1; transform: translateY(0) scale(1); }
  86% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-4px); }
}
.prg-float-msg { animation: prgFloatMsg 5s ease forwards; }
`;

/** Shared style for the small header icon buttons (opacity / expand / close). */
const iconBtn: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  flexShrink: 0,
  WebkitTapHighlightColor: "transparent",
};

/** #12 — chat settings sub-view: shows and edits the player's screen name. */
function ChatSettingsPanel({ t, name }: { t: TFunction; name: string | null }) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 16,
        backgroundColor: "rgba(3,7,18, calc(var(--chat-opacity) * 0.6))",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#9ca3af", marginBottom: 10 }}>
        {t("chat.settings")}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "rgba(30,41,57, calc(var(--chat-opacity) + 0.2))",
          border: "1px solid rgba(54,65,83,0.6)",
          borderRadius: 12,
          padding: "12px 14px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{t("chat.screenName")}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name ?? "…"}
          </div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("prg:open-change-name"))}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 10,
            background: "rgba(43,127,255,0.9)",
            border: "none",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {t("chat.edit")}
        </button>
      </div>
    </div>
  );
}

/**
 * Mobile live chat, modelled on EVO-style live-casino apps.
 *
 * Closed state: a floating chat button (bottom-right) with an unread badge and
 * a subtle wiggle whenever a new message arrives.
 *
 * Open state: a translucent bottom sheet. It defaults to ~half the screen so
 * the bet buttons stay faintly visible through the frosted glass; the player
 * can swipe up (or tap the chevron) for full screen and swipe down to collapse
 * or dismiss. Focusing the input auto-expands to full and the sheet floats
 * above the on-screen keyboard via the VisualViewport API.
 *
 * Rendered only inside PlayerLayout's mobile branch, so it is the sole chat
 * WebSocket consumer on small screens (desktop uses `LiveChat`).
 */
export default function MobileChat() {
  const t = useT();
  const { messages, presence, connected, send, lastError, historyLoaded } = useChatWs();

  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [showOpacity, setShowOpacity] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);
  const [unread, setUnread] = useState(0);
  // #7 — recent messages that float over the feed while the sheet is closed.
  // #12 — chat settings sub-view + the player's current screen name.
  const [showSettings, setShowSettings] = useState(false);
  const [myName, setMyName] = useState<string | null>(null);

  // Visual-viewport tracking so the sheet lifts above the on-screen keyboard.
  const [vp, setVp] = useState<{ h: number; kb: number }>({ h: 0, kb: 0 });

  // Live drag feedback for the swipe-to-resize gesture.
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cooldownUntilRef = useRef(0);
  // Seen-message tracking keys off message IDs, not an index into `messages`.
  // The array is capped at 100 and REPLACED wholesale on reconnect, so an
  // index watermark pinned at 100 (or shrunk on reconnect) permanently killed
  // unread + floats mid-session. A Set of ids survives both.
  const seenIdsRef = useRef<Set<string>>(new Set());
  const floatSeenIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const prevUnreadRef = useRef(0);
  const focusExpandRef = useRef(false);
  const nameFetchedRef = useRef(false);
  const dragRef = useRef<{ startY: number; moved: number; active: boolean }>({
    startY: 0,
    moved: 0,
    active: false,
  });

  // Restore persisted panel opacity.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(OPACITY_KEY);
      if (saved !== null) setOpacity(clampOpacity(Number(saved)));
    } catch {
      /* ignore */
    }
  }, []);

  const handleOpacityChange = (v: number) => {
    const next = clampOpacity(v);
    setOpacity(next);
    try {
      window.localStorage.setItem(OPACITY_KEY, String(next));
    } catch {
      /* ignore */
    }
  };

  // Follow the visual viewport: `kb` is the keyboard height, `h` the visible
  // height. Used to size the sheet and float it above the keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      setVp({ h: window.innerHeight, kb: 0 });
      return;
    }
    const onResize = () => {
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setVp({ h: Math.round(vv.height), kb });
    };
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  // #12 — keep the displayed screen name in sync (GameWrapper broadcasts it on
  // profile load and after a change), and lazily fetch it the first time the
  // settings sub-view is opened.
  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent<string>).detail;
      if (name) setMyName(name);
    };
    window.addEventListener("prg:name-changed", handler as EventListener);
    return () => window.removeEventListener("prg:name-changed", handler as EventListener);
  }, []);
  useEffect(() => {
    if (!showSettings || myName || nameFetchedRef.current) return;
    nameFetchedRef.current = true;
    fetch("/api/me/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const name = j?.data?.display_name;
        if (name) setMyName(name);
      })
      .catch(() => undefined);
  }, [showSettings, myName]);

  // Treat the initial history payload as already-seen so backlog isn't counted
  // as unread when the player first joins.
  useEffect(() => {
    if (historyLoaded && !hydratedRef.current) {
      hydratedRef.current = true;
      for (const m of messages) {
        seenIdsRef.current.add(m.id);
        floatSeenIdsRef.current.add(m.id);
      }
      setUnread(0);
    }
  }, [historyLoaded, messages]);

  // Recompute the unread badge as messages arrive or the sheet opens. Counts
  // messages whose id we haven't marked seen — so a reconnect that replaces
  // history with older lines (already-seen ids) doesn't spuriously badge them.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (isOpen) {
      for (const m of messages) seenIdsRef.current.add(m.id);
      setUnread(0);
    } else {
      setUnread(messages.reduce((n, m) => (seenIdsRef.current.has(m.id) ? n : n + 1), 0));
    }
  }, [messages, isOpen]);

  // Opened from the hamburger (PlayerMenu) now that the floating button is gone.
  useEffect(() => {
    const onOpen = () => openSheet();
    window.addEventListener("prg:open-chat", onOpen);
    return () => window.removeEventListener("prg:open-chat", onOpen);
  });

  // `unread` still drives which recent lines float over the feed; the button
  // wiggle it also fed is gone with the button.
  useEffect(() => {
    prevUnreadRef.current = unread;
  }, [unread]);

  // Floats use the SHARED hook, same as desktop. Mobile had its own simpler
  // copy — hard 5s expiry, max 3, no fade, no queue — which is why lines
  // vanished noticeably faster here and a burst just dropped messages. One
  // implementation means one behaviour: 5s fully opaque, 3s fade, at most 10 on
  // screen and the rest queued.
  //
  // myName is null so your OWN lines float too. The old copy filtered them out,
  // which is what made sending a message look like nothing happened.
  const floating = useChatFloats(messages, !isOpen, null, historyLoaded);


  // Keep the newest message in view on new content / open / expand.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isOpen, expanded]);

  // Tick the send-cooldown countdown once active.
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = setInterval(() => {
      const left = Math.ceil((cooldownUntilRef.current - Date.now()) / 1000);
      setCooldownLeft(left > 0 ? left : 0);
    }, 250);
    return () => clearInterval(id);
  }, [cooldownLeft]);

  const startCooldown = () => {
    cooldownUntilRef.current = Date.now() + SEND_COOLDOWN_MS;
    setCooldownLeft(Math.ceil(SEND_COOLDOWN_MS / 1000));
  };

  const openSheet = () => {
    setIsOpen(true);
  };

  const closeSheet = () => {
    setIsOpen(false);
    setExpanded(false);
    setShowOpacity(false);
    setShowSettings(false);
    inputRef.current?.blur();
  };

  const handleSend = () => {
    if (!draft.trim() || cooldownLeft > 0) return;
    send(draft);
    setDraft("");
    startCooldown();
  };

  const insertEmoji = (emoji: string) => {
    setDraft((d) => (d + emoji).slice(0, MAX_CHAT_LENGTH));
    inputRef.current?.focus();
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  // --- swipe to expand / collapse / dismiss (drag handle + header) ---
  const onDragStart = (e: PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startY: e.clientY, moved: 0, active: true };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  const onDragMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const delta = e.clientY - dragRef.current.startY;
    dragRef.current.moved = delta;
    // Follow the finger downward; allow a small upward hint before snapping.
    setDragOffset(delta > 0 ? delta : Math.max(delta, -24));
  };
  const onDragEnd = () => {
    if (!dragRef.current.active) return;
    const delta = dragRef.current.moved;
    dragRef.current.active = false;
    setDragging(false);
    setDragOffset(0);
    if (delta < -EXPAND_THRESHOLD) {
      setExpanded(true);
    } else if (delta > COLLAPSE_THRESHOLD) {
      if (expanded) setExpanded(false);
      else closeSheet();
    }
  };

  // Typing needs the full height because the keyboard claims the lower half.
  const onInputFocus = () => {
    if (!expanded) {
      focusExpandRef.current = true;
      setExpanded(true);
    }
  };
  const onInputBlur = () => {
    if (focusExpandRef.current) {
      focusExpandRef.current = false;
      setExpanded(false);
    }
  };

  // Sheet geometry from the visual viewport, with CSS-unit fallbacks for SSR /
  // the first paint before the effect runs.
  const fullH = vp.h ? `${vp.h}px` : "100dvh";
  const halfH = vp.h ? `${Math.round(vp.h * HALF_RATIO)}px` : "52dvh";
  const sheetHeight = expanded ? fullH : halfH;
  const translateY = !isOpen ? "100%" : `${dragOffset}px`;
  const sheetTransition = dragging
    ? "none"
    : "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), height 0.26s cubic-bezier(0.22, 1, 0.36, 1), bottom 0.2s ease";

  const containerStyle = {
    "--chat-opacity": String(opacity),
    position: "fixed",
    left: 0,
    right: 0,
    // Keyboard inset PLUS the clipped-frame offset. `fixed` resolves against
    // our frame, so inside an operator's page a sheet docked at 0 docks to the
    // bottom of the iframe — the part hanging off the screen. Resolves to just
    // the keyboard inset when nothing is clipped.
    bottom: `calc(${vp.kb}px + ${VISIBLE_BOTTOM_INSET})`,
    height: sheetHeight,
    // Above the sticky header (70) and the pinned info bar (60): it is a modal
    // sheet, so nothing in the page chrome should paint over its input or its
    // close button. Still below the seat/session covers (190/200), which must
    // win over everything.
    zIndex: 100,
    transform: `translateY(${translateY})`,
    transition: sheetTransition,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "rgba(16,24,40, var(--chat-opacity))",
    borderTop: "1px solid rgba(54,65,83,0.7)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    boxShadow: "0 -10px 34px rgba(0,0,0,0.34)",
    backdropFilter: "blur(7px)",
    WebkitBackdropFilter: "blur(7px)",
    willChange: "transform, height",
  } as CSSProperties;

  const sendDisabled = !connected || !draft.trim() || cooldownLeft > 0;

  return (
    <>
      <style>{STYLES}</style>

      {/* The floating chat button and its unread badge were removed: on a phone
          the bubble sat over the bet pads and the red count competed with the
          game for attention. Chat now opens from the hamburger menu, which is
          where every other secondary action already lives. The sheet itself is
          unchanged — see the `prg:open-chat` listener above. */}

      {/* Recent lines, rendered INLINE where this component is mounted — the
          left half of the strip under the table. They used to float over the
          feed, which meant a message you had just sent appeared on top of the
          video for a few seconds and then vanished with nowhere to look for it.
          Unboxed, matching the desktop treatment. */}
      {!isOpen && floating.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            width: "100%",
            pointerEvents: "none",
          }}
        >
          {floating.map((f) => (
            <div
              key={f.key}
              className="prg-float-msg"
              style={{
                padding: "1px 0",
                textShadow: "0 1px 3px rgba(0,0,0,0.95)",
                opacity: f.fading ? 0 : 1,
                transition: `opacity ${FLOAT_FADE_MS}ms linear`,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: "#93b8ff", marginRight: 5 }}>{f.user}</span>
              <span style={{ fontSize: 11, color: "#f3f4f6", wordBreak: "break-word" }}>{f.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Translucent bottom sheet (open state) */}
      <div style={containerStyle} inert={!isOpen}>
        {/* Drag handle + header — the swipe zone */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          style={{
            touchAction: "none",
            cursor: "grab",
            background: "rgba(30,41,57, calc(var(--chat-opacity) + 0.06))",
            borderBottom: "1px solid rgba(54,65,83,0.6)",
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 2 }}>
            <div style={{ width: 40, height: 5, borderRadius: 9999, background: "rgba(203,213,225,0.5)" }} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 12px 10px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: 9999,
                    backgroundColor: connected ? "#05df72" : "#fb2c36",
                    border: "2px solid #1e2939",
                  }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", lineHeight: 1.1 }}>{t("chat.title")}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  {connected
                    ? t(presence === 1 ? "chat.onlineOne" : "chat.onlineMany", { count: presence })
                    : t("chat.connecting")}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                onClick={() => setShowSettings((v) => !v)}
                aria-label={t("chat.settings")}
                title={t("chat.settings")}
                style={iconBtn}
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ opacity: showSettings ? 1 : 0.7 }}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
              <button
                onClick={() => setShowOpacity((v) => !v)}
                aria-label={t("chat.opacity")}
                title={t("chat.opacity")}
                style={iconBtn}
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ opacity: 0.7 }}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-label={t(expanded ? "chat.collapse" : "chat.expand")}
                title={t(expanded ? "chat.collapse" : "chat.expand")}
                style={iconBtn}
              >
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ opacity: 0.7, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button onClick={closeSheet} aria-label={t("chat.close")} style={iconBtn}>
                <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} style={{ opacity: 0.7 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Opacity slider popover */}
        {showOpacity && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              background: "rgba(16,24,40, calc(var(--chat-opacity) + 0.1))",
              borderBottom: "1px solid rgba(54,65,83,0.5)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap" }}>{t("chat.opacity")}</span>
            <input
              type="range"
              min={MIN_OPACITY}
              max={MAX_OPACITY}
              step={0.05}
              value={opacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              aria-label={t("chat.opacity")}
              style={{ flex: 1, accentColor: "#2b7fff" }}
            />
            <span style={{ fontSize: 10, color: "#9ca3af", width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(opacity * 100)}
            </span>
          </div>
        )}

        {/* Message list (or the settings sub-view) */}
        {showSettings ? (
          <ChatSettingsPanel t={t} name={myName} />
        ) : (
        <div
          ref={scrollerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "14px 16px 4px 16px",
            backgroundColor: "rgba(3,7,18, calc(var(--chat-opacity) * 0.6))",
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", fontSize: 12, color: "#6a7282", padding: "12px 0" }}>{t("chat.empty")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: "flex" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 11,
                          // System notices are amber so a private message from
                          // us is never mistaken for another player talking.
                          color: msg.system ? "#f0b100" : "#fff",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {msg.user}
                      </span>
                      <span style={{ fontSize: 10, color: "#6a7282" }}>{fmtTime(msg.time)}</span>
                    </div>
                    <div
                      style={{
                        borderRadius: 12,
                        minHeight: 28,
                        padding: "6px 10px",
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: msg.system
                          ? "rgba(240,177,0,0.14)"
                          : "rgba(30,41,57, calc(var(--chat-opacity) + 0.28))",
                        border: msg.system ? "1px solid rgba(240,177,0,0.35)" : undefined,
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#f3f4f6", wordBreak: "break-word" }}>{msg.text}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Inline error / rate-limit notice */}
        {lastError && (
          <div
            style={{
              padding: "6px 16px",
              fontSize: 11,
              color: "#fb2c36",
              backgroundColor: "rgba(251,44,54,0.08)",
              borderTop: "1px solid rgba(251,44,54,0.2)",
              flexShrink: 0,
            }}
          >
            {lastError}
          </div>
        )}

        {/* Emoji picker */}

        {/* Input bar */}
        <div
          style={{
            padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px) 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(16,24,40, var(--chat-opacity))",
            borderTop: "1px solid rgba(54,65,83,0.6)",
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder={connected ? t("chat.placeholder") : t("chat.connecting")}
            disabled={!connected}
            maxLength={MAX_CHAT_LENGTH}
            /* 16px font prevents iOS Safari from zooming the page on focus */
            style={{
              flex: 1,
              height: 42,
              fontSize: 16,
              borderRadius: 10,
              padding: "0 12px",
              color: "#fff",
              outline: "none",
              border: "1px solid rgba(54,65,83,0.8)",
              backgroundColor: "rgba(30,41,57, calc(var(--chat-opacity) + 0.2))",
              opacity: connected ? 1 : 0.5,
            }}
          />
          <button
            onClick={handleSend}
            disabled={sendDisabled}
            aria-label={t("chat.send")}
            title={t("chat.send")}
            style={{
              flexShrink: 0,
              height: 42,
              width: 42,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              background: "rgba(43,127,255,0.9)",
              cursor: sendDisabled ? "not-allowed" : "pointer",
              opacity: sendDisabled ? 0.45 : 1,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {cooldownLeft > 0 ? (
              <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{cooldownLeft}</span>
            ) : (
              <svg width={19} height={19} viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
