"use client";

import { useState } from "react";

const CHIPS = [50, 100, 250, 500, 1000, 2500, 5000];

export default function ChipSelector() {
  const [selected, setSelected] = useState<number>(100);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          onClick={() => setSelected(chip)}
          className={`w-[120px] py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
            selected === chip
              ? "bg-[#2b7fff] ring-2 ring-[#2b7fff]/50 scale-105"
              : "bg-[#1e2939] border border-[#364153] hover:bg-[#283548]"
          }`}
        >
          ₱{chip.toLocaleString()}
        </button>
      ))}
      {/* SEND button */}
      <button
        className="w-[120px] py-3 rounded-xl text-sm font-bold text-white mt-2 flex items-center justify-center gap-2"
        style={{
          background: "linear-gradient(to bottom, #fb2c36, #c41e28)",
        }}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
        </svg>
        SEND
      </button>
    </div>
  );
}
