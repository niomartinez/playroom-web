"use client";

import { useState } from "react";
import { sendToParent } from "@/lib/iframe-bridge";
import { useGame } from "@/lib/game-context";

const TIPS = [50, 100, 250, 500, 1000, 2500, 5000];

/** Left sidebar — TIP selector for tipping the dealer. Separate from betting chips. */
export default function ChipSelector() {
  const [selectedTip, setSelectedTip] = useState<number>(100);
  const [sent, setSent] = useState(false);
  const { token, balance, setBalance, cashierUrl } = useGame();

  const handleSendTip = () => {
    if (token === "demo") {
      // Demo mode: deduct from local balance
      if (selectedTip > balance) return;
      setBalance((prev) => prev - selectedTip);
      setSent(true);
      setTimeout(() => setSent(false), 1500);
      return;
    }
    // Real mode: call tip API or open cashier
    if (cashierUrl) {
      window.location.href = cashierUrl;
    } else {
      sendToParent("openCashier");
    }
  };

  return (
    <div
      className="absolute left-[1vw] top-[2%] bottom-[2%] z-20 flex flex-col items-center justify-between"
      style={{ width: "8vw" }}
    >
      {TIPS.map((tip) => (
        <button
          key={tip}
          onClick={() => setSelectedTip(tip)}
          className="flex items-center justify-center cursor-pointer transition-all w-full"
          style={{
            height: `${100 / (TIPS.length + 1.5) - 1}%`,
            borderRadius: "0.8vw",
            backgroundColor: "rgba(0,0,0,0.8)",
            border: selectedTip === tip
              ? "2px solid rgba(255,0,128,0.9)"
              : "1px solid rgba(255,0,128,0.5)",
            transform: selectedTip === tip ? "scale(1.05)" : "scale(1)",
          }}
        >
          <span className="font-bold text-white" style={{ fontSize: "1.4vh" }}>
            ₱{tip.toLocaleString()}
          </span>
        </button>
      ))}

      <button
        onClick={handleSendTip}
        className="flex items-center justify-center cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] w-full"
        style={{
          height: `${100 / (TIPS.length + 1.5) - 1}%`,
          borderRadius: "9999px",
          background: "linear-gradient(to right, #e60076, #e7000b)",
          border: "2px solid #fb64b6",
          boxShadow: "0px 25px 50px rgba(0,0,0,0.25)",
          gap: "0.4vw",
        }}
      >
        <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: "1.4vh", height: "1.4vh" }} className="text-white">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
        <span className="font-bold text-white" style={{ fontSize: "1.4vh" }}>{sent ? "SENT!" : "SEND"}</span>
      </button>
    </div>
  );
}
