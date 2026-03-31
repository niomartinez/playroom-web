"use client";

import { useGame } from "@/lib/game-context";
import { useBetting } from "@/lib/use-betting";
import { sendToParent } from "@/lib/iframe-bridge";

const CHIPS = [50, 100, 250, 500, 1000, 2500, 5000];

export default function ChipSelector() {
  const { selectedChip, setSelectedChip, cashierUrl } = useGame();
  const { isBettingOpen } = useBetting();

  const handleDeposit = () => {
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
      {CHIPS.map((chip) => (
        <button
          key={chip}
          onClick={() => setSelectedChip(chip)}
          className="flex items-center justify-center cursor-pointer transition-all w-full"
          style={{
            height: `${100 / (CHIPS.length + 1.5) - 1}%`,
            borderRadius: "0.8vw",
            backgroundColor: "rgba(0,0,0,0.8)",
            border: selectedChip === chip
              ? "2px solid rgba(255,0,128,0.9)"
              : "1px solid rgba(255,0,128,0.5)",
            transform: selectedChip === chip ? "scale(1.05)" : "scale(1)",
            opacity: isBettingOpen ? 1 : 0.5,
          }}
        >
          <span className="font-bold text-white" style={{ fontSize: "1.4vh" }}>
            {chip.toLocaleString()}
          </span>
        </button>
      ))}

      {/* DEPOSIT / SEND button */}
      <button
        onClick={handleDeposit}
        className="flex items-center justify-center cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] w-full"
        style={{
          height: `${100 / (CHIPS.length + 1.5) - 1}%`,
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
        <span className="font-bold text-white" style={{ fontSize: "1.4vh" }}>SEND</span>
      </button>
    </div>
  );
}
