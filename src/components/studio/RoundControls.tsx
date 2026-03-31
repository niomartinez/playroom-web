"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStudio } from "@/lib/studio-context";
import { useAngelEye, type ConnectionStatus } from "@/lib/use-angel-eye";
import type { AngelEyeEvent } from "@/lib/angel-eye-parser";
import { API_BASE } from "@/lib/ws-config";

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

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  disconnected: "#6a7282",
  connecting:   "#f0b100",
  connected:    "#05df72",
  error:        "#fb2c36",
  unsupported:  "#fb2c36",
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  disconnected: "Shoe Disconnected",
  connecting:   "Connecting...",
  connected:    "Shoe Connected",
  error:        "Connection Error",
  unsupported:  "Browser Not Supported",
};

export default function RoundControls() {
  const studio = useStudio();
  const angelEye = useAngelEye();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [dealing, setDealing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentFightRef = useRef<string | null>(null);

  // --- API helpers ---

  const apiCall = useCallback(async (path: string, body?: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}${path}`, {
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
      const data = await apiCall("/internal/round/start", {
        game_id: studio.tableId,
        betting_time: studio.bettingTime,
      });

      const fightId = data?.data?.id || data?.data?.fight_id;
      currentFightRef.current = fightId;

      studio.setRoundStatus("betting_open");

      // Start countdown
      setCountdown(studio.bettingTime);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            studio.setRoundStatus("dealing");
            return null;
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

  // --- Angel Eye event handler ---

  useEffect(() => {
    const unsubscribe = angelEye.onEvent((event: AngelEyeEvent) => {
      const now = new Date().toLocaleTimeString("en-GB");
      studio.setLastUpdated(now);

      switch (event.type) {
        case "card_dealt":
          // Forward card to API
          if (currentFightRef.current) {
            apiCall("/internal/round/card", {
              fight_id: currentFightRef.current,
              side: event.side,
              card: event.card,
              player_score: event.playerScore,
              banker_score: event.bankerScore,
            });
          }

          // Update studio display
          studio.setCurrentRound((prev) => {
            if (!prev) return prev;
            if (event.side === "player") {
              return {
                ...prev,
                playerCards: event.playerCards,
                playerScore: event.playerScore,
              };
            }
            return {
              ...prev,
              bankerCards: event.bankerCards,
              bankerScore: event.bankerScore,
            };
          });
          break;

        case "result":
          // Forward result to API — triggers settlement
          if (currentFightRef.current) {
            apiCall("/internal/round/result", {
              fight_id: currentFightRef.current,
              game_id: studio.tableId,
              outcome: event.outcome,
              player_cards: event.playerCards,
              banker_cards: event.bankerCards,
              player_score: event.playerScore,
              banker_score: event.bankerScore,
              player_pair: event.playerPair,
              banker_pair: event.bankerPair,
            });
          }

          studio.setRoundStatus("result");
          studio.setCurrentRound((prev) => ({
            roundId: prev?.roundId || "",
            roundNumber: prev?.roundNumber || event.roundNumber,
            playerCards: event.playerCards,
            bankerCards: event.bankerCards,
            playerScore: event.playerScore,
            bankerScore: event.bankerScore,
            winner: event.outcome.charAt(0).toUpperCase() as "P" | "B" | "T",
          }));

          // Auto-return to waiting after result display
          setTimeout(() => {
            studio.setRoundStatus("waiting");
            currentFightRef.current = null;
          }, 5000);
          break;

        case "standby":
          // Shoe is idle between rounds
          break;

        case "redeal":
          // Dealer re-scanned a card — reset current cards
          studio.setCurrentRound((prev) => {
            if (!prev) return prev;
            return { ...prev, playerCards: [], bankerCards: [], playerScore: 0, bankerScore: 0 };
          });
          break;

        case "error":
          // Show error in UI
          break;
      }
    });

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angelEye.onEvent]);

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
      {/* Shoe Connection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full"
            style={{
              width: 8,
              height: 8,
              backgroundColor: STATUS_COLORS[angelEye.status],
              animation: angelEye.status === "connecting" ? "pulse 1s infinite" : undefined,
            }}
          />
          <span className="text-xs font-medium" style={{ color: STATUS_COLORS[angelEye.status] }}>
            {STATUS_LABELS[angelEye.status]}
          </span>
        </div>

        {angelEye.status === "disconnected" || angelEye.status === "error" ? (
          <button
            onClick={angelEye.connect}
            className="rounded-md px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#1a1a2e", color: "#d08700", border: "1px solid rgba(208,135,0,0.4)" }}
          >
            Connect Shoe
          </button>
        ) : angelEye.status === "connected" ? (
          <button
            onClick={angelEye.disconnect}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#1a1a2e", color: "#6a7282", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Disconnect
          </button>
        ) : null}
      </div>

      {angelEye.error && (
        <p className="text-xs" style={{ color: "#fb2c36" }}>{angelEye.error}</p>
      )}

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
