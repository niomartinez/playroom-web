"use client";

import { useEffect, useRef, useCallback, type SetStateAction } from "react";
import { WS_BASE } from "./ws-config";
import { useStudio } from "./studio-context";
import type { RoundStatus, CurrentRound, Roads, RoadEntry } from "./game-context";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

/** Max reconnection delay in ms. */
const MAX_DELAY = 30_000;

type RoundSetter = (r: SetStateAction<CurrentRound | null>) => void;
type RoadsSetter = (r: SetStateAction<Roads>) => void;
type StatusSetter = (s: SetStateAction<RoundStatus>) => void;

/**
 * Connects to the lobby WebSocket and keeps StudioContext in sync.
 * Reconnects automatically with exponential backoff.
 */
export function useStudioWs() {
  const {
    setRoundStatus,
    setCurrentRound,
    setRoads,
    setLastUpdated,
  } = useStudio();

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const mountedRef = useRef(true);

  const updateTimestamp = useCallback(() => {
    const now = new Date();
    const ts = now.toLocaleTimeString("en-US", { hour12: false });
    setLastUpdated(ts);
  }, [setLastUpdated]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const url = `${WS_BASE}/ws/lobby?api_key=${encodeURIComponent(API_KEY)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0; // reset backoff on successful connect
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleStudioMessage(msg, setRoundStatus, setCurrentRound, setRoads);
        updateTimestamp();
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRoundStatus, setCurrentRound, setRoads, updateTimestamp]);

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(1000 * 2 ** retryRef.current, MAX_DELAY);
    retryRef.current += 1;
    setTimeout(() => {
      if (mountedRef.current) connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, [connect]);
}

/* ------------------------------------------------------------------ */
/*  Message handling                                                    */
/* ------------------------------------------------------------------ */

function handleStudioMessage(
  msg: Record<string, unknown>,
  setRoundStatus: StatusSetter,
  setCurrentRound: RoundSetter,
  setRoads: RoadsSetter,
) {
  const type = msg.type as string | undefined;
  const data = (msg.data ?? msg) as Record<string, unknown>;

  switch (type) {
    case "RoundStarted":
    case "round_started": {
      setRoundStatus("dealing");
      const roundId = (data.roundId ?? data.round_id ?? "") as string;
      setCurrentRound({
        roundId,
        roundNumber: (data.round_number ?? data.roundNumber ?? roundId) as string | number,
        playerCards: [],
        bankerCards: [],
        playerScore: 0,
        bankerScore: 0,
      });
      break;
    }

    case "BettingClosed":
    case "betting_closed": {
      setRoundStatus("dealing");
      break;
    }

    case "CardDealt":
    case "card_dealt": {
      setCurrentRound((prev) => {
        if (!prev) return prev;
        const side = (data.side as string)?.toLowerCase();
        const card = data.card as string;
        if (side === "player") {
          return {
            ...prev,
            playerCards: [...prev.playerCards, card],
            playerScore: (data.player_score ?? data.playerScore ?? prev.playerScore) as number,
          };
        }
        if (side === "banker") {
          return {
            ...prev,
            bankerCards: [...prev.bankerCards, card],
            bankerScore: (data.banker_score ?? data.bankerScore ?? prev.bankerScore) as number,
          };
        }
        return prev;
      });
      break;
    }

    case "RoundResult":
    case "round_result": {
      setRoundStatus("result");
      // Backend sends: { outcome: "Banker", player: { score, cards }, banker: { score, cards } }
      const outcomeStr = (data.outcome ?? data.winner ?? "") as string;
      const winner = outcomeStr.charAt(0).toUpperCase() as "P" | "B" | "T";
      const playerObj = (data.player ?? {}) as Record<string, unknown>;
      const bankerObj = (data.banker ?? {}) as Record<string, unknown>;
      setCurrentRound((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          winner,
          playerScore: (playerObj.score ?? data.player_score ?? data.playerScore ?? prev.playerScore) as number,
          bankerScore: (bankerObj.score ?? data.banker_score ?? data.bankerScore ?? prev.bankerScore) as number,
          playerCards: (playerObj.cards ?? prev.playerCards) as string[],
          bankerCards: (bankerObj.cards ?? prev.bankerCards) as string[],
        };
      });

      // Update roads
      if (winner) {
        setRoads((prev) => {
          const entry: RoadEntry = {
            result: winner,
            playerPair: data.player_pair as boolean | undefined,
            bankerPair: data.banker_pair as boolean | undefined,
          };
          return {
            beadRoad: [...prev.beadRoad, entry],
            bigRoad: [...prev.bigRoad, entry],
            playerWins: prev.playerWins + (winner === "P" ? 1 : 0),
            bankerWins: prev.bankerWins + (winner === "B" ? 1 : 0),
            ties: prev.ties + (winner === "T" ? 1 : 0),
          };
        });
      }
      break;
    }

    case "TableOpened":
    case "table_opened": {
      setRoundStatus("waiting");
      break;
    }

    case "TableClosed":
    case "table_closed": {
      setRoundStatus("waiting");
      setCurrentRound(null);
      break;
    }

    case "lobby_state":
    case "LobbyState": {
      // Full snapshot -- populate roads from history
      const history = (data.history ?? data.results ?? []) as Array<Record<string, unknown>>;
      const entries: RoadEntry[] = history.map((h) => ({
        result: ((h.winner as string)?.charAt(0).toUpperCase() ?? "T") as "P" | "B" | "T",
        playerPair: h.player_pair as boolean | undefined,
        bankerPair: h.banker_pair as boolean | undefined,
      }));
      let pWins = 0;
      let bWins = 0;
      let ties = 0;
      for (const e of entries) {
        if (e.result === "P") pWins++;
        else if (e.result === "B") bWins++;
        else ties++;
      }
      setRoads({
        beadRoad: entries,
        bigRoad: entries,
        playerWins: pWins,
        bankerWins: bWins,
        ties,
      });

      // Set round status from snapshot
      const status = data.round_status ?? data.roundStatus;
      if (typeof status === "string") {
        setRoundStatus(status as RoundStatus);
      }
      break;
    }

    default:
      break;
  }
}
