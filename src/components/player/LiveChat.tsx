"use client";

import { useState, useRef, useEffect, type CSSProperties, type KeyboardEvent } from "react";
import { useIsMobile } from "@/lib/use-mobile";
import { useChatWs } from "@/lib/use-chat-ws";
import { useT } from "@/lib/i18n";

/** localStorage key for the persisted chat panel opacity. */
const OPACITY_KEY = "prg_chat_opacity";
const DEFAULT_OPACITY = 0.2;
const MIN_OPACITY = 0.2;
const MAX_OPACITY = 1.0;

/** Client-side send cooldown (mirrors the server's 1 msg / 5s rule for UX). */
const SEND_COOLDOWN_MS = 5000;

/** Curated emoji set for the picker — no external deps, CSP-safe. */
const EMOJIS = [
  "😀","😂","😅","😉","😍","😎","🤑","😭","😡","🤔",
  "👍","👎","👏","🙏","💪","🔥","💯","🎉","✨","💰",
  "🃏","🎰","🍀","💵","💸","⚡","❤️","💔","👀","🤝",
  "😱","🥳","😴","🤮","🤡","👑","🚀","⭐","✅","❌",
];

function clampOpacity(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_OPACITY;
  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, v));
}

export default function LiveChat({ mobile }: { mobile?: boolean }) {
  const isMobileHook = useIsMobile();
  const isMobile = mobile ?? isMobileHook;
  const t = useT();
  const [isOpen, setIsOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [showOpacity, setShowOpacity] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0); // seconds remaining
  const { messages, presence, connected, send, lastError } = useChatWs();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cooldownUntilRef = useRef(0);

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
    setShowEmoji(false);
    startCooldown();
  };

  const insertEmoji = (emoji: string) => {
    setDraft((d) => (d + emoji).slice(0, 200));
    inputRef.current?.focus();
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen && !isMobile) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute right-4 top-4 z-20 rounded-xl px-4 py-2 text-sm font-semibold text-white transition cursor-pointer"
        style={{
          background: "rgba(30,41,57,0.8)",
          border: "1px solid rgba(54,65,83,0.8)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        {t("chat.open")}
      </button>
    );
  }

  // Format the time component of an ISO string into a compact "HH:MM" for display.
  const fmtTime = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return "";
    }
  };

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
                    <span className="font-semibold text-[11px] text-white truncate max-w-[140px]">{msg.user}</span>
                    <span className="text-[10px] text-[#6a7282]">{fmtTime(msg.time)}</span>
                  </div>
                  <div
                    className="rounded-[12px] min-h-[28px] px-[10px] py-[6px] flex items-center"
                    style={{ backgroundColor: "rgba(30,41,57, calc(var(--chat-opacity) + 0.2))" }}
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
      {showEmoji && (
        <div
          className={`px-[12px] py-[10px] grid gap-[2px] ${isMobile ? "grid-cols-8" : "grid-cols-10"}`}
          style={{
            background: "rgba(16,24,40, calc(var(--chat-opacity) + 0.12))",
            borderTop: "1px solid rgba(54,65,83,0.5)",
          }}
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => insertEmoji(e)}
              className={`leading-none rounded-[6px] hover:bg-white/10 transition cursor-pointer flex items-center justify-center ${
                isMobile ? "text-[22px] min-h-[40px]" : "text-[18px] min-h-[26px] p-[3px]"
              }`}
              aria-label={e}
              type="button"
            >
              {e}
            </button>
          ))}
        </div>
      )}

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
        <button
          onClick={() => setShowEmoji((v) => !v)}
          disabled={!connected}
          className={`shrink-0 rounded-[10px] flex items-center justify-center hover:bg-white/10 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isMobile ? "h-[40px] w-[40px] text-[22px]" : "h-[32px] w-[32px] text-[18px]"
          }`}
          aria-label={t("chat.emoji")}
          title={t("chat.emoji")}
          type="button"
        >
          🙂
        </button>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={connected ? t("chat.placeholder") : t("chat.connecting")}
          disabled={!connected}
          maxLength={200}
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
