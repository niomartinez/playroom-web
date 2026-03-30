"use client";

import { useState } from "react";

const CHIPS = [50, 100, 250, 500, 1000, 2500, 5000];

export default function ChipSelector() {
  const [selected, setSelected] = useState<number>(100);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-[12px]">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          onClick={() => setSelected(chip)}
          className="flex items-center justify-center cursor-pointer transition-all"
          style={{
            width: "161px",
            height: "62px",
            borderRadius: "14px",
            backgroundColor: "rgba(0,0,0,0.8)",
            border: selected === chip
              ? "2px solid rgba(255,0,128,0.9)"
              : "1px solid rgba(255,0,128,0.5)",
            transform: selected === chip ? "scale(1.05)" : "scale(1)",
          }}
        >
          <span className="font-bold text-[18px] text-white">
            ₱{chip.toLocaleString()}
          </span>
        </button>
      ))}

      {/* SEND button */}
      <button
        className="flex items-center justify-center gap-[8px] cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
        style={{
          width: "161px",
          height: "60px",
          borderRadius: "33554400px",
          background: "linear-gradient(to right, #e60076, #e7000b)",
          border: "2px solid #fb64b6",
          boxShadow: "0px 25px 50px rgba(0,0,0,0.25)",
        }}
      >
        {/* Heart icon */}
        <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-bold text-[18px] text-white">SEND</span>
      </button>
    </div>
  );
}
