"use client";

import { useEffect, useRef, type SetStateAction } from "react";
import { WS_BASE, LOBBY_API_KEY } from "./ws-config";
import { useStudio } from "./studio-context";
import type { RoundStatus, CurrentRound, Roads, RoadEntry } from "./game-context";

const MAX_DELAY = 30_000;

type RoundSetter = (r: SetStateAction<CurrentRound | null>) => void;
type RoadsSetter = (r: SetStateAction<Roads>) => void;
type StatusSetter = (s: SetStateAction<RoundStatus>) => void;

export function useStudioWs() {
  const {
    setRoundStatus,
    setCurrentRound,
    setRoads,
    setLastUpdated,
  } = useStudio();

  // Use refs to avoid stale closures in WS callbacks
  const settersRef = useRef({ setRoundStatus, setCurrentRound, setRoads, setLastUpdated });
  settersRef.current = { setRoundStatus, setCurrentRound, setRoads, setLastUpdated };

  useEffect(() => {
    let mounted = true;
    let ws: WebSocket | null = null;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!mounted) return;

      const url = `${WS_BASE}/ws/lobby?api_key=${encodeURIComponent(LOBBY_API_KEY)}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        retryCount = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const s = settersRef.current;
          handleStudioMessage(msg, s.setRoundStatus, s.setCurrentRound, s.setRoads);
          const now = new Date();
          s.setLastUpdated(now.toLocaleTimeString("en-US", { hour12: false }));
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        const delay = Math.min(1000 * 2 ** retryCount, MAX_DELAY);
        retryCount++;
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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

    case "lobby_state":
    case "LobbyState": {
      const history = (data.history ?? data.results ?? []) as Array<Record<string, unknown>>;
      const entries: RoadEntry[] = history.map((h) => ({
        result: ((h.winner as string)?.charAt(0).toUpperCase() ?? "T") as "P" | "B" | "T",
        playerPair: h.player_pair as boolean | undefined,
        bankerPair: h.banker_pair as boolean | undefined,
      }));
      let pWins = 0, bWins = 0, ties = 0;
      for (const e of entries) {
        if (e.result === "P") pWins++;
        else if (e.result === "B") bWins++;
        else ties++;
      }
      setRoads({ beadRoad: entries, bigRoad: entries, playerWins: pWins, bankerWins: bWins, ties });
      break;
    }

    default:
      break;
  }
}
