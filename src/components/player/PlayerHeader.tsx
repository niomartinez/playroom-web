"use client";

import { useState, useEffect, useRef } from "react";
import { useGame } from "@/lib/game-context";
import { sendToParent } from "@/lib/iframe-bridge";

export default function PlayerHeader() {
  const { currentRound, roundStatus, lobbyUrl } = useGame();
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown from server-sent value when betting opens
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (roundStatus === "betting_open") {
      // Use server-sent countdown (operator-configurable per table)
      const initial = currentRound?.countdown ?? 15;
      setCountdown(initial);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundStatus, currentRound?.countdown]);

  const roundLabel = currentRound?.roundNumber
    ? `Round #${currentRound.roundNumber}`
    : "---";

  const statusColor: Record<string, string> = {
    waiting: "#6a7282",
    betting_open: "#05df72",
    dealing: "#f0b100",
    result: "#fb2c36",
  };

  const statusLabel: Record<string, string> = {
    waiting: "Waiting",
    betting_open: countdown !== null ? `PLACE BETS (${countdown}s)` : "Place Bets",
    dealing: "Dealing",
    result: "Result",
  };

  const handleBack = () => {
    if (lobbyUrl) {
      window.location.href = lobbyUrl;
    } else {
      sendToParent("closeGame");
    }
  };

  return (
    <header
      className="flex items-center justify-between px-[1.5vw] border-b border-[#364153] min-h-0 h-full"
      style={{
        background: "linear-gradient(to right, #101828, #1e2939)",
        boxShadow: "0px 25px 50px rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center gap-[0.8vw]">
        <button onClick={handleBack} className="cursor-pointer">
          <img src="/logo.png" alt="Play Room Gaming" className="object-contain h-[3.5vh]" />
        </button>
        <span className="text-[1.1vh] text-[#99a1af]">Live Baccarat</span>
      </div>
      <div className="flex items-center gap-[0.6vw]">
        {/* Round status pill */}
        <div
          className="flex items-center gap-[0.4vw] border rounded-[0.6vw] px-[0.8vw] py-[0.4vh]"
          style={{
            backgroundColor: roundStatus === "betting_open" ? "rgba(5,223,114,0.15)" : "#1e2939",
            borderColor: roundStatus === "betting_open" ? "#05df72" : "#364153",
          }}
        >
          <span
            className="rounded-full"
            style={{
              width: "0.8vh",
              height: "0.8vh",
              backgroundColor: statusColor[roundStatus] || "#6a7282",
              animation: roundStatus === "betting_open" ? "pulse 1s infinite" : undefined,
            }}
          />
          <span
            className="font-semibold"
            style={{
              fontSize: "1.2vh",
              color: roundStatus === "betting_open" ? "#05df72" : "white",
            }}
          >
            {statusLabel[roundStatus] || "LIVE"}
          </span>
        </div>
        {/* Round number */}
        <div className="flex items-center gap-[0.4vw] bg-[#1e2939] border border-[#364153] rounded-[0.6vw] px-[0.8vw] py-[0.4vh]">
          <svg className="text-[#99a1af]" style={{ width: "1.2vh", height: "1.2vh" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="font-semibold text-white" style={{ fontSize: "1.2vh" }}>{roundLabel}</span>
        </div>
      </div>
    </header>
  );
}
