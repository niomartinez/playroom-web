"use client";

import { useEffect } from "react";
import { useGame } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";

const CHIPS = [
  { value: 10, src: "/mobile-assets/chip-10.png" },
  { value: 25, src: "/mobile-assets/chip-25.png" },
  { value: 50, src: "/mobile-assets/chip-50.png" },
  { value: 100, src: "/mobile-assets/chip-100.png" },
  { value: 500, src: "/mobile-assets/chip-500.png" },
  { value: 1000, src: "/mobile-assets/chip-1000.png" },
];

export default function BalanceBar() {
  const { balance, selectedChip, setSelectedChip } = useGame();
  const isMobile = useIsMobile();

  /**
   * Auto-step-down: when the live balance drops below the current selected
   * chip, snap to the largest affordable chip. If no chip is affordable,
   * leave the selection alone — placeBet's pre-check blocks the bet anyway.
   */
  useEffect(() => {
    if (balance >= selectedChip) return;
    const affordable = CHIPS.filter((c) => c.value <= balance);
    if (affordable.length === 0) return;
    const next = affordable[affordable.length - 1].value; // largest affordable
    if (next !== selectedChip) {
      setSelectedChip(next);
    }
  }, [balance, selectedChip, setSelectedChip]);

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
            src="/mobile-assets/balance-icon.png"
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
          data-balance-chips=""
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {CHIPS.map((chip) => {
            const isSelected = selectedChip === chip.value;
            const isDisabled = balance < chip.value;
            return (
              <button
                key={chip.value}
                data-chip-denom={chip.value}
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedChip(chip.value);
                }}
                disabled={isDisabled}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  backgroundColor: "transparent",
                  border: "none",
                  transform: isSelected ? "scale(1.2)" : "scale(1)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, filter 0.15s ease",
                  boxShadow: isSelected
                    ? "0 0 18px rgba(255,255,255,0.55), 0 0 0 3px rgba(255,255,255,0.9), 0 2px 4px rgba(0,0,0,0.3)"
                    : "0 2px 4px rgba(0,0,0,0.3)",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  padding: 0,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: isSelected ? 2 : 1,
                  opacity: isDisabled ? 0.4 : 1,
                  filter: isDisabled ? "grayscale(1)" : "none",
                }}
                aria-label={`$${chip.value} chip`}
                aria-disabled={isDisabled}
              >
                <img
                  src={chip.src}
                  alt={`${chip.value} chip`}
                  style={{ width: 46, height: 46, display: "block", borderRadius: "50%" }}
                />
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
        <img
          src="/mobile-assets/balance-icon.png"
          alt="Balance"
          className="flex-shrink-0"
          style={{ width: "1.6vh", height: "1.6vh" }}
        />
        <div>
          <div className="text-[#99a1af]" style={{ fontSize: "clamp(8px, 0.9vh, 12px)" }}>Balance</div>
          <div className="font-bold text-white" style={{ fontSize: "clamp(12px, 1.4vh, 20px)" }}>{formatted}</div>
        </div>
      </div>

      {/* Chip icons */}
      <div data-balance-chips="" className="flex items-center" style={{ gap: "0.3vw" }}>
        {CHIPS.map((chip) => {
          const isSelected = selectedChip === chip.value;
          const isDisabled = balance < chip.value;
          return (
            <button
              key={chip.value}
              data-chip-denom={chip.value}
              onClick={() => {
                if (isDisabled) return;
                setSelectedChip(chip.value);
              }}
              disabled={isDisabled}
              className="rounded-full flex items-center justify-center"
              style={{
                width: "clamp(20px, 2.2vh, 36px)",
                height: "clamp(20px, 2.2vh, 36px)",
                backgroundColor: "transparent",
                border: "none",
                padding: 0,
                transform: isSelected ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, filter 0.15s ease",
                boxShadow: isSelected
                  ? "0 0 18px rgba(255,255,255,0.55), 0 0 0 3px rgba(255,255,255,0.9)"
                  : "0 2px 4px rgba(0,0,0,0.3)",
                zIndex: isSelected ? 2 : 1,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.4 : 1,
                filter: isDisabled ? "grayscale(1)" : "none",
              }}
              aria-label={`$${chip.value} chip`}
              aria-disabled={isDisabled}
            >
              <img
                src={chip.src}
                alt={`${chip.value} chip`}
                style={{ width: "100%", height: "100%", display: "block", borderRadius: "50%" }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
