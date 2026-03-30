"use client";

import { useState } from "react";

interface ChatMessage {
  id: number;
  user: string;
  emoji: string;
  level: number;
  time: string;
  text: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: 1, user: "DragonKing88", emoji: "🐉", level: 25, time: "2m ago", text: "Banker streak incoming!" },
  { id: 2, user: "LuckyAce", emoji: "🎰", level: 18, time: "3m ago", text: "Nice call on that last hand" },
  { id: 3, user: "MrBaccarat", emoji: "🃏", level: 42, time: "5m ago", text: "Player due for a win" },
  { id: 4, user: "HighRoller99", emoji: "💎", level: 31, time: "5m ago", text: "Going all in on banker" },
  { id: 5, user: "CardShark", emoji: "🦈", level: 12, time: "6m ago", text: "Good luck everyone!" },
];

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(true);
  const [message, setMessage] = useState("");

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute right-4 top-4 z-20 bg-[#1e2939]/90 border border-[#364153] rounded-xl px-4 py-2 text-sm font-semibold text-white hover:bg-[#283548]/90 transition cursor-pointer"
      >
        Chat
      </button>
    );
  }

  return (
    <div
      className="absolute right-4 top-4 bottom-4 z-20 w-[280px] flex flex-col overflow-hidden"
      style={{
        backgroundColor: "#101828",
        border: "1px solid #364153",
        borderRadius: "16px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
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
          {/* Chat icon with green dot */}
          <div className="relative">
            <svg className="w-[24px] h-[24px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div
              className="absolute -bottom-[2px] -right-[2px] w-[12px] h-[12px] rounded-full"
              style={{
                backgroundColor: "#05df72",
                border: "2px solid #1447e6",
              }}
            />
          </div>
          <div>
            <div className="font-bold text-[13px] text-white">Live Chat</div>
            <div className="text-[12px] text-[#dbeafe]">5 players online</div>
          </div>
        </div>
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <svg className="w-[20px] h-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message area */}
      <div
        className="flex-1 overflow-y-auto px-[16px] pt-[16px]"
        style={{ backgroundColor: "rgba(3,7,18,0.5)" }}
      >
        <div className="flex flex-col gap-[8px]">
          {MOCK_MESSAGES.map((msg) => (
            <div key={msg.id} className="flex gap-[12px]">
              {/* Avatar */}
              <div
                className="w-[28px] h-[28px] rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #2b7fff, #ad46ff)",
                  border: "2px solid #364153",
                }}
              >
                <span className="text-[14px] leading-none">{msg.emoji}</span>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[8px] mb-[4px]">
                  <span className="font-semibold text-[11px] text-white">{msg.user}</span>
                  <span className="bg-[#155dfc] rounded-full px-[8px] py-[2px] text-[12px] text-white">
                    Lv.{msg.level}
                  </span>
                  <span className="text-[12px] text-[#6a7282]">{msg.time}</span>
                </div>
                {/* Message bubble */}
                <div
                  className="bg-[#1e2939] rounded-[12px] h-[28px] px-[10px] flex items-center"
                >
                  <span className="text-[12px] text-[#f3f4f6] truncate">{msg.text}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div
        className="px-[16px] pt-[17px] pb-[16px] flex items-center gap-[8px]"
        style={{
          backgroundColor: "#101828",
          borderTop: "1px solid #364153",
          borderRadius: "0 0 16px 16px",
          height: "50px",
        }}
      >
        {/* Text input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-[32px] bg-[#1e2939] border border-[#364153] rounded-[10px] px-[12px] text-[12px] text-white placeholder-[#6a7282] outline-none"
        />
        {/* Emoji button */}
        <button
          className="w-[38px] h-[32px] bg-[#1e2939] border border-[#364153] rounded-[10px] flex items-center justify-center text-[#6a7282] hover:text-white transition cursor-pointer"
        >
          <svg className="w-[20px] h-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>
        {/* Send button */}
        <button
          className="w-[36px] h-[32px] bg-[#155dfc] rounded-[10px] flex items-center justify-center text-white hover:brightness-110 transition cursor-pointer"
        >
          <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
