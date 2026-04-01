"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStudio } from "@/lib/studio-context";

/**
 * Studio Round Controls — the dealer's primary control panel.
 *
 * Handles:
 *  - Angel Eye shoe connection (Web Serial API)
 *  - New Round / Pause / Close table
 *  - Betting countdown timer
 *  - Card-by-card dealing via shoe events
 *  - Manual input fallback
 */

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  waiting:      { label: "WAITING",       color: "#6a7282" },
  betting_open: { label: "PLACE BETS",    color: "#05df72" },
  dealing:      { label: "NO MORE BETS",  color: "#f0b100" },
  result:       { label: "RESULT",        color: "#fb2c36" },
};

export default function RoundControls() {
  const studio = useStudio();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [dealing, setDealing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentFightRef = useRef<string | null>(null);

  // --- API helpers ---

  const apiCall = useCallback(async (path: string, body?: Record<string, unknown>) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }, []);

  // --- Round lifecycle ---

  const startNewRound = useCallback(async () => {
    if (studio.roundStatus !== "waiting" || studio.tableStatus !== "open") return;

    setDealing(true);
    try {
      const data = await apiCall("/api/studio/round-start", {
        game_id: studio.tableId,
        betting_time: studio.bettingTime,
      });

      const fightId = data?.data?.id || data?.data?.fight_id;
      currentFightRef.current = fightId;

      studio.setRoundStatus("betting_open");
      studio.setCurrentRound({
        roundId: fightId || "",
        roundNumber: data?.data?.external_fight_id || fightId || "",
        playerCards: [],
        bankerCards: [],
        playerScore: 0,
        bankerScore: 0,
      });

      // Start countdown
      setCountdown(studio.bettingTime);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      // Error starting round
    } finally {
      setDealing(false);
    }
  }, [studio, apiCall]);

  const pauseTable = useCallback(() => {
    studio.setTableStatus("paused");
  }, [studio]);

  const resumeTable = useCallback(() => {
    studio.setTableStatus("open");
  }, [studio]);

  const closeTable = useCallback(async () => {
    studio.setTableStatus("closed");
    studio.setRoundStatus("waiting");
    // TODO: broadcast TableClosed via API
  }, [studio]);

  // Transition to "dealing" when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      studio.setRoundStatus("dealing");
      setCountdown(null);
    }
  }, [countdown, studio]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- Render ---

  const phase = PHASE_LABELS[studio.roundStatus] || PHASE_LABELS.waiting;
  const canStartRound = studio.roundStatus === "waiting" && studio.tableStatus === "open" && !dealing;

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{
        background: "linear-gradient(135deg, #171717, #000000)",
        border: "1px solid rgba(208,135,0,0.3)",
      }}
    >
      {/* Current Phase */}
      <div
        className="flex items-center justify-center gap-3 rounded-lg py-3"
        style={{
          backgroundColor: `${phase.color}15`,
          border: `1px solid ${phase.color}40`,
        }}
      >
        <span
          className="inline-block rounded-full"
          style={{
            width: 10,
            height: 10,
            backgroundColor: phase.color,
            animation: studio.roundStatus === "betting_open" ? "pulse 1s infinite" : undefined,
          }}
        />
        <span className="font-bold text-sm tracking-wider" style={{ color: phase.color }}>
          {phase.label}
          {countdown !== null && ` (${countdown}s)`}
        </span>
      </div>

      {/* Round Controls */}
      <div className="flex flex-col gap-2">
        {/* New Round */}
        <button
          onClick={startNewRound}
          disabled={!canStartRound}
          className="w-full rounded-lg py-3 font-bold text-sm tracking-wider transition-all"
          style={{
            backgroundColor: canStartRound ? "#05df72" : "rgba(255,255,255,0.05)",
            color: canStartRound ? "#000" : "#6a7282",
            cursor: canStartRound ? "pointer" : "not-allowed",
            boxShadow: canStartRound ? "0 4px 15px rgba(5,223,114,0.3)" : "none",
          }}
        >
          {dealing ? "STARTING..." : "NEW ROUND"}
        </button>

        {/* Table controls row */}
        <div className="flex gap-2">
          {studio.tableStatus === "open" ? (
            <button
              onClick={pauseTable}
              disabled={studio.roundStatus !== "waiting"}
              className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all"
              style={{
                backgroundColor: studio.roundStatus === "waiting" ? "#f0b100" : "rgba(255,255,255,0.05)",
                color: studio.roundStatus === "waiting" ? "#000" : "#6a7282",
                cursor: studio.roundStatus === "waiting" ? "pointer" : "not-allowed",
              }}
            >
              PAUSE TABLE
            </button>
          ) : studio.tableStatus === "paused" ? (
            <button
              onClick={resumeTable}
              className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all"
              style={{ backgroundColor: "#05df72", color: "#000", cursor: "pointer" }}
            >
              RESUME TABLE
            </button>
          ) : null}

          <button
            onClick={closeTable}
            disabled={studio.tableStatus === "closed" || studio.roundStatus !== "waiting"}
            className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all"
            style={{
              backgroundColor: studio.tableStatus !== "closed" && studio.roundStatus === "waiting"
                ? "rgba(251,44,54,0.2)"
                : "rgba(255,255,255,0.05)",
              color: studio.tableStatus !== "closed" && studio.roundStatus === "waiting"
                ? "#fb2c36"
                : "#6a7282",
              border: "1px solid rgba(251,44,54,0.3)",
              cursor: studio.tableStatus !== "closed" && studio.roundStatus === "waiting"
                ? "pointer"
                : "not-allowed",
            }}
          >
            CLOSE TABLE
          </button>
        </div>
      </div>

      {/* Betting Time Config */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs" style={{ color: "#6a7282" }}>Bet window:</span>
        <div className="flex items-center gap-1">
          {[10, 15, 20, 25, 30].map((t) => (
            <button
              key={t}
              onClick={() => studio.setBettingTime(t)}
              className="rounded px-2 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: studio.bettingTime === t ? "rgba(208,135,0,0.25)" : "rgba(255,255,255,0.05)",
                color: studio.bettingTime === t ? "#d08700" : "#6a7282",
                border: studio.bettingTime === t ? "1px solid rgba(208,135,0,0.4)" : "1px solid transparent",
              }}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
