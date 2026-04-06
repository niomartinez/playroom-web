"use client";

import { useState } from "react";
import { sendToParent } from "@/lib/iframe-bridge";
import { useGame } from "@/lib/game-context";

const TIPS = [50, 100, 250, 500, 1000, 2500, 5000];

export default function MobileTipPanel({ onClose }: { onClose: () => void }) {
  const [selectedTip, setSelectedTip] = useState<number>(100);
  const [sent, setSent] = useState(false);
  const { token, balance, setBalance, cashierUrl } = useGame();

  const handleSendTip = () => {
    if (token === "demo") {
      if (selectedTip > balance) return;
      setBalance((prev) => prev - selectedTip);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 1200);
      return;
    }
    if (cashierUrl) {
      window.location.href = cashierUrl;
    } else {
      sendToParent("openCashier");
    }
  };

  return (
    <div
      style={{
        margin: "0 19px",
        backgroundColor: "#101828",
        border: "1px solid #364153",
        borderRadius: 14,
        padding: 16,
        animation: "fadeIn 0.15s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
          Send Tip to Dealer
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#6a7282",
            fontSize: 20,
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Tip amounts grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {TIPS.map((tip) => (
          <button
            key={tip}
            onClick={() => setSelectedTip(tip)}
            style={{
              height: 44,
              borderRadius: 10,
              backgroundColor: "rgba(0,0,0,0.5)",
              border:
                selectedTip === tip
                  ? "2px solid rgba(255,0,128,0.9)"
                  : "1px solid rgba(255,0,128,0.4)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              transform: selectedTip === tip ? "scale(1.03)" : "scale(1)",
            }}
          >
            ₱{tip.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Send button */}
      <button
        onClick={handleSendTip}
        disabled={selectedTip > balance}
        style={{
          width: "100%",
          height: 48,
          borderRadius: 9999,
          background: "linear-gradient(to right, #e60076, #e7000b)",
          border: "2px solid #fb64b6",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: selectedTip > balance ? "not-allowed" : "pointer",
          opacity: selectedTip > balance ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>❤</span>
        {sent ? "SENT!" : `SEND ₱${selectedTip.toLocaleString()}`}
      </button>
    </div>
  );
}
