"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useIsMobile } from "@/lib/use-mobile";
import { useChatWs } from "@/lib/use-chat-ws";

export default function LiveChat({ mobile }: { mobile?: boolean }) {
  const isMobileHook = useIsMobile();
  const isMobile = mobile ?? isMobileHook;
  const [isOpen, setIsOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const { messages, presence, connected, send, lastError } = useChatWs();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to newest message on every render that changes length.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = () => {
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
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
        className="absolute right-4 top-4 z-20 bg-[#1e2939]/90 border border-[#364153] rounded-xl px-4 py-2 text-sm font-semibold text-white hover:bg-[#283548]/90 transition cursor-pointer"
      >
        Chat
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

  return (
    <div
      className={isMobile ? "flex flex-col overflow-hidden" : "absolute right-4 top-4 bottom-4 z-20 w-[280px] flex flex-col overflow-hidden"}
      style={{
        backgroundColor: "#101828",
        border: "1px solid #364153",
        borderRadius: isMobile ? "14px" : "16px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        ...(isMobile ? { maxHeight: 360, width: "100%" } : {}),
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-[16px]"
        style={{
          height: "52px",
          background: "linear-gradient(to right, #155dfc, #1447e6)",
          borderBottom: "1px solid rgba(43,127,255,0.3)",
          borderRadius: "16px 16px 0 0",
        }}
      >
        <div className="flex items-center gap-[12px]">
          <div className="relative">
            <svg className="w-[24px] h-[24px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div
              className="absolute -bottom-[2px] -right-[2px] w-[12px] h-[12px] rounded-full"
              style={{
                backgroundColor: connected ? "#05df72" : "#fb2c36",
                border: "2px solid #1447e6",
              }}
            />
          </div>
          <div>
            <div className="font-bold text-[13px] text-white">Live Chat</div>
            <div className="text-[12px] text-[#dbeafe]">
              {connected
                ? `${presence} ${presence === 1 ? "player" : "players"} online`
                : "Connecting..."}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="Close chat"
        >
          <svg className="w-[20px] h-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message area */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-[16px] pt-[16px]"
        style={{ backgroundColor: "rgba(3,7,18,0.5)" }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-[12px] text-[#6a7282] py-[12px]">
            No messages yet — say hi!
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
                  <div className="bg-[#1e2939] rounded-[12px] min-h-[28px] px-[10px] py-[6px] flex items-center">
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

      {/* Input bar */}
      <div
        className="px-[16px] pt-[10px] pb-[10px] flex items-center gap-[8px]"
        style={{
          backgroundColor: "#101828",
          borderTop: "1px solid #364153",
          borderRadius: "0 0 16px 16px",
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={connected ? "Type a message..." : "Connecting..."}
          disabled={!connected}
          maxLength={200}
          className="flex-1 h-[32px] bg-[#1e2939] border border-[#364153] rounded-[10px] px-[12px] text-[12px] text-white placeholder-[#6a7282] outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!connected || !draft.trim()}
          className="w-[36px] h-[32px] bg-[#155dfc] rounded-[10px] flex items-center justify-center text-white hover:brightness-110 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
