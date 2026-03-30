"use client";

import { useState } from "react";

interface ChatMessage {
  id: number;
  user: string;
  badge?: string;
  badgeColor?: string;
  text: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: 1, user: "DragonKing88", badge: "VIP", badgeColor: "#d08700", text: "Banker streak incoming!" },
  { id: 2, user: "LuckyAce", badge: "GOLD", badgeColor: "#f0b100", text: "Nice call on that last hand" },
  { id: 3, user: "MrBaccarat", text: "Player due for a win" },
  { id: 4, user: "HighRoller99", badge: "VIP", badgeColor: "#d08700", text: "Going all in on banker" },
  { id: 5, user: "CardShark", badge: "SILVER", badgeColor: "#99a1af", text: "Good luck everyone!" },
  { id: 6, user: "TableTen", text: "Tie is coming I can feel it" },
  { id: 7, user: "BetMaster", badge: "GOLD", badgeColor: "#f0b100", text: "3rd banker in a row" },
];

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(true);
  const [message, setMessage] = useState("");

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute right-4 top-4 z-20 bg-[#1e2939]/90 border border-[#364153] rounded-xl px-4 py-2 text-sm font-semibold text-white hover:bg-[#283548]/90 transition"
      >
        💬 Chat
      </button>
    );
  }

  return (
    <div className="absolute right-4 top-4 bottom-4 z-20 w-[320px] flex flex-col bg-[#101828]/95 backdrop-blur-sm border border-[#364153] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#364153]">
        <div>
          <div className="text-sm font-semibold text-white">Live Chat</div>
          <div className="text-xs text-[#99a1af]">24 players online</div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[#99a1af] hover:text-white transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {MOCK_MESSAGES.map((msg) => (
          <div key={msg.id} className="text-sm">
            <span className="font-semibold text-white">{msg.user}</span>
            {msg.badge && (
              <span
                className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: msg.badgeColor, color: "#000" }}
              >
                {msg.badge}
              </span>
            )}
            <p className="text-[#99a1af] mt-0.5">{msg.text}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#364153]">
        <div className="flex items-center gap-2 bg-[#1e2939] rounded-xl px-3 py-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#6a7282] outline-none"
          />
          <button className="text-[#6a7282] hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          <button className="text-[#2b7fff] hover:text-[#5a9fff] transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
