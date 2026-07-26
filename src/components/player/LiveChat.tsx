"use client";

import { useState, useRef, useEffect, type CSSProperties, type KeyboardEvent } from "react";
import { useIsMobile } from "@/lib/use-mobile";
import { useChatWs } from "@/lib/use-chat-ws";
import { useChatFloats, FLOAT_FADE_MS } from "@/lib/use-chat-floats";
import { useT } from "@/lib/i18n";
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

export default function LiveChat({ mobile }: { mobile?: boolean }) {
  const isMobileHook = useIsMobile();
  const isMobile = mobile ?? isMobileHook;
  const t = useT();
  const [isOpen, setIsOpen] = useState(true);
  const [draft, setDraft] = useState("");

  // Desktop no longer has a panel to open or close — the composer is always
  // there. The chat icon in the video's shortcut row now opens the chat
  // SETTINGS (opacity, display name), which is where those controls moved.
  useEffect(() => {
    const onToggle = () => {
      if (isMobile) setIsOpen((v) => !v);
      else setShowSettings((v) => !v);
    };
    window.addEventListener("prg:toggle-chat", onToggle);
    return () => window.removeEventListener("prg:toggle-chat", onToggle);
  }, [isMobile]);
  const [showSettings, setShowSettings] = useState(false);
  const [showOpacity, setShowOpacity] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0); // seconds remaining
  const { messages, presence, connected, send, lastError, historyLoaded } = useChatWs();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cooldownUntilRef = useRef(0);

  // Own name, for excluding own messages from the floats. Best-effort: the
  // profile fetch + the rename broadcast, same sources the mobile sheet uses.
  const [myName, setMyName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.data?.display_name) setMyName(j.data.display_name);
      })
      .catch(() => undefined);
    const onName = (e: Event) => {
      // GameWrapper dispatches prg:name-changed with detail = the name STRING
      // (not an object), so read the string; tolerate the object shape too.
      const d = (e as CustomEvent<unknown>).detail;
      const name = typeof d === "string" ? d : (d as { name?: string } | null)?.name;
      if (name) setMyName(name);
    };
    window.addEventListener("prg:name-changed", onName);
    return () => {
      cancelled = true;
      window.removeEventListener("prg:name-changed", onName);
    };
  }, []);

  // Recent messages float over the feed while the panel is minimized (desktop).
  // Desktop: floats ARE the transcript now, so they run always (not only while
  // minimised) and include the player's own lines — seeing your message appear
  // is the only confirmation it sent, now that there is no panel to scroll.
  const floats = useChatFloats(
    messages,
    isMobile ? !isOpen : true,
    isMobile ? myName : null,
    historyLoaded,
  );

  // Panel opacity — drives the --chat-opacity custom property so one control
  // changes every translucent surface at once. Restored from localStorage on
  // mount (default 0.65).
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);
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

  // Auto-scroll to newest message on every render that changes length.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Tick the send-cooldown countdown once a second while it's active.
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

  /* ---------------------------------------------------------------- */
  /*  DESKTOP — Evolution shape                                          */
  /* ---------------------------------------------------------------- */
  //
  // A composer pinned top-right, always ready to type, with recent lines
  // floating beneath it and fading out. No panel, no scrollback, no header.
  //
  // The old 280px full-height panel occupied the entire right edge of the video
  // permanently, for content that is glanceable and mostly ephemeral. Evolution
  // treats chat as an overlay on the table rather than furniture beside it, and
  // that is what players are used to. Scrollback is deliberately gone: anything
  // older than the last few lines was never the reason to look at chat mid-hand.
  //
  // Opacity and display name moved into the settings popover behind the chat
  // icon in the video's shortcut row — see VideoQuickIcons.
  if (!isMobile) {
    return (
      <div
        className="absolute z-20 flex flex-col items-stretch gap-2"
        style={{
          // Left side: the winners marquee moved to the right, and the left is
          // clear of the shortcut icons, so chat can start higher.
          left: 16,
          top: 12,
          width: 300,
          maxWidth: "38%",
          // The column is a layout guide only — clicks must reach the video
          // except on the controls themselves.
          pointerEvents: "none",
          ["--chat-opacity" as string]: String(opacity),
        } as CSSProperties}
      >
        {/* Composer */}
        <div
          className="flex items-center gap-2 rounded-full px-2 py-1.5"
          style={{
            pointerEvents: "auto",
            background: "rgba(16,24,40, calc(var(--chat-opacity) + 0.12))",
            border: "1px solid rgba(54,65,83,0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.32)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder={connected ? t("chat.placeholder") : t("chat.connecting")}
            disabled={!connected}
            maxLength={MAX_CHAT_LENGTH}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-white placeholder-[#6a7282] text-[12px] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!connected || !draft.trim() || cooldownLeft > 0}
            className="shrink-0 h-[26px] w-[26px] rounded-full flex items-center justify-center text-white hover:brightness-110 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "rgba(43,127,255,0.85)" }}
            aria-label={t("chat.send")}
            title={t("chat.send")}
          >
            {cooldownLeft > 0 ? (
              <span className="tabular-nums text-[11px]">{cooldownLeft}</span>
            ) : (
              <svg className="w-[14px] h-[14px]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>

        {lastError && (
          <div
            className="rounded-lg px-3 py-1.5 text-[11px]"
            style={{
              pointerEvents: "auto",
              background: "rgba(251,44,54,0.16)",
              border: "1px solid rgba(251,44,54,0.4)",
              color: "#ffb3b8",
            }}
          >
            {lastError}
          </div>
        )}

        {/* Settings — opened from the chat icon in the shortcut row */}
        {showSettings && (
          <div
            className="rounded-xl px-3 py-2 flex flex-col gap-2"
            style={{
              pointerEvents: "auto",
              background: "rgba(16,24,40,0.94)",
              border: "1px solid rgba(54,65,83,0.8)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#9ca3af]">{t("chat.title")}</span>
              <span className="text-[10px] text-[#6a7282]">
                {t(presence === 1 ? "chat.onlineOne" : "chat.onlineMany", {
                  count: presence,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#9ca3af] whitespace-nowrap">
                {t("chat.opacity")}
              </span>
              <input
                type="range"
                min={0.15}
                max={0.95}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                aria-label={t("chat.opacity")}
                className="flex-1"
              />
              <span className="text-[10px] text-[#6a7282] tabular-nums w-[26px] text-right">
                {Math.round(opacity * 100)}
              </span>
            </div>
            <button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("prg:open-change-name"))
              }
              className="text-[11px] text-left rounded-lg px-2 py-1.5 hover:bg-white/5 transition cursor-pointer"
              style={{ color: "#f0b100", border: "1px solid rgba(240,177,0,0.3)" }}
            >
              {t("chat.screenName")}
            </button>
          </div>
        )}

        {/* Recent lines, floating below the composer */}
        {floats.map((f) => (
          <div
            key={f.key}
            style={{
              pointerEvents: "none",
              // No box: bare text over the feed. A bubble per line stacked ten
              // deep read as clutter sitting on the table; a text shadow alone
              // keeps it legible over both bright felt and a dark studio.
              padding: "1px 2px",
              textShadow:
                "0 1px 3px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.75)",
              // Fully opaque for the hold, then fades over exactly the window
              // the hook waits before freeing the slot — so a bubble is gone
              // from the screen and from the queue at the same instant.
              opacity: f.fading ? 0 : 1,
              transition: `opacity ${FLOAT_FADE_MS}ms linear`,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: f.user === "System" ? "#f0b100" : "#93b8ff",
                marginRight: 6,
              }}
            >
              {f.user}
            </span>
            <span style={{ fontSize: 12, color: "#e5e7eb", wordBreak: "break-word" }}>
              {f.text}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Format the time component of an ISO string into a compact "HH:MM" for display.
  // `fmtTime` is imported from chat-ui for a single source of truth.

  // The --chat-opacity custom property is set on the container; every
  // translucent child reads it via rgba(..., var(--chat-opacity)).
  const containerStyle = {
    // Custom property — cast because CSSProperties doesn't type `--vars`.
    "--chat-opacity": String(opacity),
    backgroundColor: "rgba(16,24,40, var(--chat-opacity))",
    border: "1px solid rgba(54,65,83,0.7)",
    borderRadius: isMobile ? "14px" : "16px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    ...(isMobile ? { maxHeight: 360, width: "100%" } : {}),
  } as CSSProperties;

  return (
    <div
      className={isMobile ? "flex flex-col overflow-hidden" : "absolute right-4 top-4 bottom-4 z-20 w-[280px] flex flex-col overflow-hidden"}
      style={containerStyle}
    >
      {/* Header — subtle neutral translucent bar (loud blue removed) */}
      <div
        className="flex items-center justify-between px-[16px]"
        style={{
          minHeight: "52px",
          background: "rgba(30,41,57, calc(var(--chat-opacity) + 0.06))",
          borderBottom: "1px solid rgba(54,65,83,0.6)",
          borderRadius: "16px 16px 0 0",
        }}
      >
        <div className="flex items-center gap-[12px]">
          <div className="relative">
            <svg className="w-[22px] h-[22px] text-[#cbd5e1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div
              className="absolute -bottom-[2px] -right-[2px] w-[11px] h-[11px] rounded-full"
              style={{
                backgroundColor: connected ? "#05df72" : "#fb2c36",
                border: "2px solid #1e2939",
              }}
            />
          </div>
          <div>
            <div className="font-semibold text-[13px] text-white">{t("chat.title")}</div>
            <div className="text-[11px] text-[#9ca3af]">
              {connected
                ? t(presence === 1 ? "chat.onlineOne" : "chat.onlineMany", { count: presence })
                : t("chat.connecting")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[4px]">
          {/* Screen name / chat settings (#12) */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("prg:open-change-name"))}
            className={`rounded-[8px] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer ${
              isMobile ? "w-[40px] h-[40px]" : "w-[30px] h-[30px]"
            }`}
            aria-label={t("chat.screenName")}
            title={t("chat.screenName")}
          >
            <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {/* Opacity control toggle */}
          <button
            onClick={() => setShowOpacity((v) => !v)}
            className={`rounded-[8px] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer ${
              isMobile ? "w-[40px] h-[40px]" : "w-[30px] h-[30px]"
            }`}
            aria-label={t("chat.opacity")}
            title={t("chat.opacity")}
          >
            <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className={`rounded-[8px] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer ${
              isMobile ? "w-[40px] h-[40px]" : "w-[30px] h-[30px]"
            }`}
            aria-label={t("chat.close")}
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Opacity slider popover */}
      {showOpacity && (
        <div
          className="flex items-center gap-[10px] px-[16px] py-[8px]"
          style={{
            background: "rgba(16,24,40, calc(var(--chat-opacity) + 0.1))",
            borderBottom: "1px solid rgba(54,65,83,0.5)",
          }}
        >
          <span className="text-[10px] text-[#9ca3af] whitespace-nowrap">{t("chat.opacity")}</span>
          <input
            type="range"
            min={MIN_OPACITY}
            max={MAX_OPACITY}
            step={0.05}
            value={opacity}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            aria-label={t("chat.opacity")}
            className="flex-1 cursor-pointer"
            style={{ accentColor: "#2b7fff" }}
          />
          <span className="text-[10px] text-[#9ca3af] tabular-nums w-[28px] text-right">
            {Math.round(opacity * 100)}
          </span>
        </div>
      )}

      {/* Message area */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-[16px] pt-[16px]"
        style={{ backgroundColor: "rgba(3,7,18, calc(var(--chat-opacity) * 0.7))" }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-[12px] text-[#6a7282] py-[12px]">
            {t("chat.empty")}
          </div>
        ) : (
          <div className="flex flex-col gap-[8px] pb-[8px]">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-[10px]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[8px] mb-[4px]">
                    <span
                      className="font-semibold text-[11px] truncate max-w-[140px]"
                      style={{ color: msg.system ? "#f0b100" : "#fff" }}
                    >
                      {msg.user}
                    </span>
                    <span className="text-[10px] text-[#6a7282]">{fmtTime(msg.time)}</span>
                  </div>
                  <div
                    className="rounded-[12px] min-h-[28px] px-[10px] py-[6px] flex items-center"
                    style={{
                      backgroundColor: msg.system
                        ? "rgba(240,177,0,0.14)"
                        : "rgba(30,41,57, calc(var(--chat-opacity) + 0.2))",
                      border: msg.system ? "1px solid rgba(240,177,0,0.35)" : undefined,
                    }}
                  >
                    <span className="text-[12px] text-[#f3f4f6] break-words">{msg.text}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inline error/status (rate limit, too long, etc.) */}
      {lastError && (
        <div
          className="px-[16px] py-[6px] text-[11px] text-[#fb2c36]"
          style={{ backgroundColor: "rgba(251,44,54,0.08)", borderTop: "1px solid rgba(251,44,54,0.2)" }}
        >
          {lastError}
        </div>
      )}

      {/* Emoji picker popover — 8 cols on mobile (bigger tap targets), 10 on desktop */}

      {/* Input bar */}
      <div
        className="px-[16px] pt-[10px] pb-[10px] flex items-center gap-[8px]"
        style={{
          backgroundColor: "rgba(16,24,40, var(--chat-opacity))",
          borderTop: "1px solid rgba(54,65,83,0.6)",
          borderRadius: "0 0 16px 16px",
        }}
      >
        {/* Emoji toggle — 40px tap target on mobile */}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={connected ? t("chat.placeholder") : t("chat.connecting")}
          disabled={!connected}
          maxLength={MAX_CHAT_LENGTH}
          /* 16px font on mobile prevents iOS Safari from zooming the page on focus */
          className={`flex-1 border rounded-[10px] px-[12px] text-white placeholder-[#6a7282] outline-none disabled:opacity-50 ${
            isMobile ? "h-[40px] text-[16px]" : "h-[32px] text-[12px]"
          }`}
          style={{
            backgroundColor: "rgba(30,41,57, calc(var(--chat-opacity) + 0.15))",
            borderColor: "rgba(54,65,83,0.8)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!connected || !draft.trim() || cooldownLeft > 0}
          className={`shrink-0 rounded-[10px] flex items-center justify-center text-white font-semibold hover:brightness-110 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isMobile ? "h-[40px] w-[40px]" : "h-[32px] w-[32px]"
          }`}
          style={{ background: "rgba(43,127,255,0.85)" }}
          aria-label={t("chat.send")}
          title={t("chat.send")}
        >
          {cooldownLeft > 0 ? (
            <span className={`tabular-nums ${isMobile ? "text-[13px]" : "text-[11px]"}`}>
              {cooldownLeft}
            </span>
          ) : (
            <svg
              className={isMobile ? "w-[19px] h-[19px]" : "w-[16px] h-[16px]"}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
