"use client";

import { useGame } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";

const CHIPS = [
  { color: "#e7000b", label: "10" },
  { color: "#2b7fff", label: "25" },
  { color: "#00a63e", label: "50" },
  { color: "#8b5cf6", label: "100" },
  { color: "#f97316", label: "500" },
  { color: "#f0b100", label: "1000" },
];

export default function BalanceBar() {
  const { balance, selectedChip, setSelectedChip } = useGame();
  const isMobile = useIsMobile();

  const formatted = balance.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (isMobile) {
    return (
      <div
        style={{
          backgroundColor: "#101828",
          border: "0.8px solid #364153",
          borderRadius: 14,
          padding: 16,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Top section: icon + balance */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <img
            src="/mobile-assets/balance-icon.svg"
            alt="Balance"
            style={{ width: 20, height: 20, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "#99A1AF", lineHeight: 1.2 }}>
              Balance
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", lineHeight: 1.2 }}>
              {formatted}
            </div>
          </div>
        </div>

        {/* Bottom section: chip row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {CHIPS.map((chip) => {
            const value = Number(chip.label);
            const isSelected = selectedChip === value;
            return (
              <button
                key={chip.label}
                onClick={() => setSelectedChip(value)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  backgroundColor: chip.color,
                  border: isSelected
                    ? "2.5px solid rgba(255,255,255,0.95)"
                    : "2px solid rgba(255,255,255,0.3)",
                  transform: isSelected ? "scale(1.2)" : "scale(1)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border 0.15s ease",
                  boxShadow: isSelected
                    ? `0 0 18px ${chip.color}cc, 0 0 0 3px rgba(255,255,255,0.9), 0 2px 4px rgba(0,0,0,0.3)`
                    : "0 2px 4px rgba(0,0,0,0.3)",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: value >= 1000 ? 9 : value >= 100 ? 10 : 11,
                  fontWeight: 700,
                  color: "#fff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  zIndex: isSelected ? 2 : 1,
                }}
                aria-label={`$${chip.label} chip`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between h-full"
      style={{
        backgroundColor: "#101828",
        border: "0.8px solid #364153",
        borderRadius: "0.7vw",
        padding: "0 1vw",
      }}
    >
      <div className="flex items-center" style={{ gap: "0.5vw" }}>
        <svg className="text-[#99a1af] flex-shrink-0" style={{ width: "1.6vh", height: "1.6vh" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" />
          <path d="M16 12a1 1 0 102 0 1 1 0 00-2 0z" />
        </svg>
        <div>
          <div className="text-[#99a1af]" style={{ fontSize: "clamp(8px, 0.9vh, 12px)" }}>Balance</div>
          <div className="font-bold text-white" style={{ fontSize: "clamp(12px, 1.4vh, 20px)" }}>{formatted}</div>
        </div>
      </div>

      {/* Chip icons */}
      <div className="flex items-center" style={{ gap: "0.3vw" }}>
        {CHIPS.map((chip) => {
          const value = Number(chip.label);
          const isSelected = selectedChip === value;
          return (
            <button
              key={chip.label}
              onClick={() => setSelectedChip(value)}
              className="rounded-full flex items-center justify-center font-bold text-white cursor-pointer"
              style={{
                width: "clamp(20px, 2.2vh, 36px)",
                height: "clamp(20px, 2.2vh, 36px)",
                backgroundColor: chip.color,
                fontSize: "clamp(6px, 0.7vh, 10px)",
                border: isSelected
                  ? "2px solid rgba(255,255,255,0.9)"
                  : "2px solid rgba(255,255,255,0.3)",
                transform: isSelected ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                boxShadow: isSelected
                  ? `0 0 18px ${chip.color}cc, 0 0 0 3px rgba(255,255,255,0.9)`
                  : "0 2px 4px rgba(0,0,0,0.3)",
                zIndex: isSelected ? 2 : 1,
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
