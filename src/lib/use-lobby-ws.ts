"use client";

import { useEffect, useRef, useCallback, type SetStateAction } from "react";
import { WS_BASE, LOBBY_API_KEY } from "./ws-config";
import {
  useGame,
  type RoundStatus,
  type CurrentRound,
  type Roads,
  type RoadEntry,
} from "./game-context";

/** Max reconnection delay in ms. */
const MAX_DELAY = 30_000;

type RoundSetter = (r: SetStateAction<CurrentRound | null>) => void;
type RoadsSetter = (r: SetStateAction<Roads>) => void;
type StatusSetter = (s: SetStateAction<RoundStatus>) => void;

/**
 * Connects to the lobby WebSocket and keeps GameContext in sync.
 * Reconnects automatically with exponential backoff.
 */
export function useLobbyWs() {
  const {
    token,
    setBalance,
    placedBets,
    setRoundStatus,
    setCurrentRound,
    setRoads,
    clearPlacedBets,
  } = useGame();

  // Use refs to avoid stale closures in WS callbacks
  const settersRef = useRef({ token, setBalance, placedBets, setRoundStatus, setCurrentRound, setRoads, clearPlacedBets });
  settersRef.current = { token, setBalance, placedBets, setRoundStatus, setCurrentRound, setRoads, clearPlacedBets };

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
          handleMessage(msg, s.setRoundStatus, s.setCurrentRound, s.setRoads, s.clearPlacedBets, s.token, s.placedBets, s.setBalance);
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

/** Demo payout odds */
const DEMO_ODDS: Record<string, Record<string, number>> = {
  P: { BAC_Player: 2, BAC_Tie: 0, BAC_Banker: 0 },
  B: { BAC_Banker: 1.95, BAC_Tie: 0, BAC_Player: 0 },
  T: { BAC_Tie: 9, BAC_Player: 1, BAC_Banker: 1 }, // tie = push on P/B
};

function handleMessage(
  msg: Record<string, unknown>,
  setRoundStatus: StatusSetter,
  setCurrentRound: RoundSetter,
  setRoads: RoadsSetter,
  clearPlacedBets?: () => void,
  token?: string | null,
  placedBets?: { betCode: string; amount: number }[],
  setBalance?: (b: SetStateAction<number>) => void,
) {
  const type = msg.type as string | undefined;
  const data = (msg.data ?? msg) as Record<string, unknown>;

  switch (type) {
    case "RoundStarted":
    case "round_started": {
      setRoundStatus("betting_open");
      clearPlacedBets?.(); // Clear bets from previous round
      const roundId = (data.roundId ?? data.round_id ?? "") as string;
      // Force-replace the entire round object so ALL previous round data is wiped
      setCurrentRound({
        roundId,
        roundNumber: (data.round_number ?? data.roundNumber ?? roundId) as string | number,
        playerCards: [],
        bankerCards: [],
        playerScore: 0,
        bankerScore: 0,
        winner: undefined,
        countdown: (data.countdown as number) || undefined,
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
      const eventRoundId = (data.roundId ?? data.round_id) as string | undefined;
      setCurrentRound((prev) => {
        if (!prev) return prev;
        // Guard: if the event carries a round ID that doesn't match, ignore it
        if (eventRoundId && String(prev.roundId) !== String(eventRoundId)) return prev;
        // Guard: don't add cards to a round that already has a result
        if (prev.winner) return prev;

        const side = (data.side as string)?.toLowerCase();
        const card = data.card as string;
        if (side === "player") {
          // Use running totals from backend if provided
          const allPlayerCards = (data.player_cards ?? data.playerCards) as string[] | undefined;
          return {
            ...prev,
            playerCards: allPlayerCards ?? [...prev.playerCards, card],
            playerScore: (data.player_score ?? data.playerScore ?? prev.playerScore) as number,
          };
        }
        if (side === "banker") {
          const allBankerCards = (data.banker_cards ?? data.bankerCards) as string[] | undefined;
          return {
            ...prev,
            bankerCards: allBankerCards ?? [...prev.bankerCards, card],
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

      // Demo mode settlement — credit winnings to local balance
      if (token === "demo" && placedBets && placedBets.length > 0 && setBalance && winner) {
        const odds = DEMO_ODDS[winner] || {};
        let totalPayout = 0;
        for (const bet of placedBets) {
          const multiplier = odds[bet.betCode];
          if (multiplier !== undefined && multiplier > 0) {
            totalPayout += bet.amount * multiplier;
          }
        }
        if (totalPayout > 0) {
          setBalance((prev) => prev + totalPayout);
        }
      }
      break;
    }

    case "RoundClosed":
    case "round_closed": {
      // Round fully settled — go back to waiting for next round
      setRoundStatus("waiting");
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
