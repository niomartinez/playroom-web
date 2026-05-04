"use client";

import { useEffect, useRef, type SetStateAction } from "react";
import { WS_BASE } from "./ws-config";
import { fetchLobbyTicket, signalSessionExpired } from "./lobby-ticket";
import {
  useGame,
  type RoundStatus,
  type CurrentRound,
  type Roads,
  type RoadEntry,
  type MainBetCounts,
  type RecentWin,
  type RecentWinLine,
  type StackedChip,
  type FlyingChip,
} from "./game-context";
import { betCodeLabel } from "./bet-codes";
import { dispatchReverseFlyToBalance } from "./chip-fly";
import { WIN_FLASH_DURATION_MS } from "@/components/player/WinFlash";

/** Max reconnection delay in ms. */
const MAX_DELAY = 30_000;

type RoundSetter = (r: SetStateAction<CurrentRound | null>) => void;
type RoadsSetter = (r: SetStateAction<Roads>) => void;
type StatusSetter = (s: SetStateAction<RoundStatus>) => void;
type MainBetCountsSetter = (c: SetStateAction<MainBetCounts | null>) => void;

export interface UseLobbyWsOptions {
  /**
   * Demo mode bypasses cookie auth when minting the lobby ticket.
   * Used by /play/demo where the user has no real session. Default
   * false (operator-launched player needs the cookie).
   */
  demo?: boolean;
}

/**
 * Connects to the lobby WebSocket and keeps GameContext in sync.
 * Reconnects automatically with exponential backoff.
 */
export function useLobbyWs(options: UseLobbyWsOptions = {}) {
  const { demo = false } = options;
  const {
    token,
    gameId,
    setBalance,
    placedBets,
    setRoundStatus,
    setCurrentRound,
    setRoads,
    setMainBetCounts,
    clearPlacedBets,
    clearStackedChips,
    setRecentWin,
    stackedChips,
    addFlyingChip,
  } = useGame();

  // Use refs to avoid stale closures in WS callbacks
  const settersRef = useRef({ token, gameId, setBalance, placedBets, setRoundStatus, setCurrentRound, setRoads, setMainBetCounts, clearPlacedBets, clearStackedChips, setRecentWin, stackedChips, addFlyingChip });
  settersRef.current = { token, gameId, setBalance, placedBets, setRoundStatus, setCurrentRound, setRoads, setMainBetCounts, clearPlacedBets, clearStackedChips, setRecentWin, stackedChips, addFlyingChip };

  useEffect(() => {
    let mounted = true;
    let ws: WebSocket | null = null;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      if (!mounted) return;

      // F-06: fetch a fresh single-use ticket on every (re)connect.
      // The previous ticket is consumed at WS-accept time on the
      // backend, so we cannot reuse it across reconnects.
      // Explicit role="player" so the proxy never falls through to the
      // studio cookie if a stale top-level studio session happens to
      // be sitting in the same browser (would mint an unscoped firehose
      // and break event delivery in the iframe).
      const result = await fetchLobbyTicket({
        demo,
        role: demo ? undefined : "player",
      });
      if (!mounted) return;
      if ("error" in result) {
        if (result.error === "unauthorized") {
          // F-06 follow-up (S-5): session cookie expired. Stop
          // reconnecting forever in the background and surface the
          // condition so the UI can prompt the player to relaunch
          // from their operator. Without this we'd silently retry
          // every 30s for the rest of the tab's life.
          signalSessionExpired();
          return;
        }
        // Network / 5xx: keep the existing exponential backoff. A
        // transient blip shouldn't permanently kill realtime updates.
        const delay = Math.min(1000 * 2 ** retryCount, MAX_DELAY);
        retryCount++;
        retryTimer = setTimeout(connect, delay);
        return;
      }

      const url = `${WS_BASE}/ws/lobby?ticket=${encodeURIComponent(result.ticket)}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        retryCount = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const s = settersRef.current;
          // Filter table-specific events by the player's table.
          // The lobby WS is shared across every table; without this filter,
          // a player on Table 1 would react to Table 2's RoundStarted /
          // BettingClosed / CardDealt / RoundResult / RoundClosed.
          const data = (msg.data ?? msg) as Record<string, unknown>;
          const eventTableId = (data.tableId ?? data.table_id) as string | undefined;
          const eventTableUuid = (data.tableUuid ?? data.table_uuid) as string | undefined;
          const myId = s.gameId;
          if (myId && (eventTableId || eventTableUuid)) {
            // Backend emits both forms (external_game_id + UUID) so we accept on
            // either match. The studio context stores UUID; the player context
            // can store external_game_id depending on launch path.
            const matches =
              (eventTableId && String(eventTableId) === String(myId)) ||
              (eventTableUuid && String(eventTableUuid) === String(myId));
            if (!matches) return;
          }
          handleMessage(msg, s.setRoundStatus, s.setCurrentRound, s.setRoads, s.clearPlacedBets, s.token, s.placedBets, s.setBalance, s.clearStackedChips, s.setMainBetCounts, s.setRecentWin, () => settersRef.current.stackedChips, s.addFlyingChip);
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

/** Demo payout odds for main bets, indexed by winner outcome. */
const DEMO_MAIN_ODDS: Record<string, Record<string, number>> = {
  P: { BAC_Player: 2, BAC_Tie: 0, BAC_Banker: 0 },
  B: { BAC_Banker: 1.95, BAC_Tie: 0, BAC_Player: 0 },
  T: { BAC_Tie: 9, BAC_Player: 1, BAC_Banker: 1 }, // tie = push on P/B
};

/** Demo payout multipliers for side bets (stake-multiplier including stake). */
const DEMO_SIDE_ODDS: Record<string, number> = {
  BAC_PerfectPair: 26,  // 25:1 + stake = 26x
  BAC_EitherPair: 6,    // 5:1 + stake = 6x
  BAC_PlayerPair: 12,   // 11:1 + stake = 12x
  BAC_BankerPair: 12,   // 11:1 + stake = 12x
};

/**
 * Mirrors `app/services/settlement_service.evaluate_side_bets` for demo.
 * Cards are wire-format strings like "KH" or "TD" (rank + 1-char suit).
 */
function evalDemoSideBets(
  playerCards: string[],
  bankerCards: string[],
): Set<string> {
  const winners = new Set<string>();
  const rank = (c: string) => (c ? c.slice(0, -1) : "");
  if (playerCards.length >= 2) {
    if (rank(playerCards[0]) === rank(playerCards[1])) {
      winners.add("BAC_PlayerPair");
      winners.add("BAC_EitherPair");
    }
    if (playerCards[0] === playerCards[1]) winners.add("BAC_PerfectPair");
  }
  if (bankerCards.length >= 2) {
    if (rank(bankerCards[0]) === rank(bankerCards[1])) {
      winners.add("BAC_BankerPair");
      winners.add("BAC_EitherPair");
    }
    if (bankerCards[0] === bankerCards[1]) winners.add("BAC_PerfectPair");
  }
  return winners;
}

/** Module-level so we can clear a pending demo flash if a new round arrives. */
let _demoFlashTimer: ReturnType<typeof setTimeout> | null = null;

function handleMessage(
  msg: Record<string, unknown>,
  setRoundStatus: StatusSetter,
  setCurrentRound: RoundSetter,
  setRoads: RoadsSetter,
  clearPlacedBets?: () => void,
  token?: string | null,
  placedBets?: { betCode: string; amount: number }[],
  setBalance?: (b: SetStateAction<number>) => void,
  clearStackedChips?: () => void,
  setMainBetCounts?: MainBetCountsSetter,
  setRecentWin?: (w: RecentWin | null) => void,
  // Stacked chips can change between message receipt and the post-flash
  // cleanup, so we accept a getter rather than a snapshot value.
  getStackedChips?: () => Record<string, StackedChip[]>,
  addFlyingChip?: (chip: Omit<FlyingChip, "id" | "startedAt">) => void,
) {
  const type = msg.type as string | undefined;
  const data = (msg.data ?? msg) as Record<string, unknown>;

  switch (type) {
    case "RoundStarted":
    case "round_started": {
      setRoundStatus("betting_open");
      clearPlacedBets?.(); // Clear bets from previous round
      clearStackedChips?.(); // Clear stacked chip markers from previous round
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
      // Zero out the live P/T/B bar at the start of every round. The server
      // also broadcasts an explicit MainBetCounts(zeros) right after — this
      // is just defence in depth in case that broadcast is dropped.
      const tableId = (data.tableId ?? data.table_id ?? "") as string;
      setMainBetCounts?.({
        tableId,
        roundId,
        Player: { players: 0, amount: 0 },
        Tie:    { players: 0, amount: 0 },
        Banker: { players: 0, amount: 0 },
      });
      break;
    }

    case "MainBetCounts":
    case "main_bet_counts": {
      const counts = (data.counts ?? {}) as Record<string, { players?: number; amount?: number }>;
      const tableId = (data.tableId ?? data.table_id ?? "") as string;
      const roundId = (data.roundId ?? data.round_id ?? "") as string;
      setMainBetCounts?.({
        tableId,
        roundId,
        Player: {
          players: Number(counts.Player?.players ?? 0),
          amount:  Number(counts.Player?.amount  ?? 0),
        },
        Tie: {
          players: Number(counts.Tie?.players ?? 0),
          amount:  Number(counts.Tie?.amount  ?? 0),
        },
        Banker: {
          players: Number(counts.Banker?.players ?? 0),
          amount:  Number(counts.Banker?.amount  ?? 0),
        },
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

      // Demo mode settlement — credit winnings to local balance + drive
      // the YOU WON flash + chip-fly-back animation that
      // use-balance-ws.ts normally drives off the backend RoundSettled
      // event. Demo has no RoundSettled (no real bets server-side), so
      // we fan it out locally here. Real-wallet settlement
      // (token !== "demo") is untouched — this entire branch is gated
      // on the demo token.
      if (token === "demo" && placedBets && placedBets.length > 0 && setBalance && winner) {
        const playerCards = (playerObj.cards as string[] | undefined) ?? [];
        const bankerCards = (bankerObj.cards as string[] | undefined) ?? [];
        const sideWinners = evalDemoSideBets(playerCards, bankerCards);
        const mainOdds = DEMO_MAIN_ODDS[winner] || {};
        // Track per-bet payoff so we can render the win-flash lines.
        const perBetPayoff: { betCode: string; payoff: number }[] = [];
        let totalPayoff = 0;
        for (const bet of placedBets) {
          let payoff = 0;
          const mainMult = mainOdds[bet.betCode];
          if (mainMult !== undefined && mainMult > 0) {
            payoff = bet.amount * mainMult;
          } else if (sideWinners.has(bet.betCode)) {
            payoff = bet.amount * (DEMO_SIDE_ODDS[bet.betCode] ?? 0);
          }
          if (payoff > 0) {
            totalPayoff += payoff;
            perBetPayoff.push({ betCode: bet.betCode, payoff });
          }
        }

        if (totalPayoff > 0) {
          setBalance((prev) => prev + totalPayoff);

          // Trigger the YOU WON flash + reverse-fly only when there are
          // winners. No-win demo rounds still get the auto-clear via
          // RoundClosed below.
          if (setRecentWin) {
            // Consolidate per bet code (matches use-balance-ws.ts).
            const grouped = new Map<string, number>();
            for (const w of perBetPayoff) {
              grouped.set(w.betCode, (grouped.get(w.betCode) ?? 0) + w.payoff);
            }
            const lines: RecentWinLine[] = Array.from(grouped.entries()).map(
              ([betCode, amount]) => ({
                label: betCodeLabel(betCode),
                amount,
                betCode,
              }),
            );
            const fightId = String((data.roundId ?? data.fightId ?? "") as string);
            setRecentWin({ fightId, totalPayoff, lines });

            // Schedule cleanup: clear the flash, snapshot stacks, clear
            // them, fly the snapshot back to the balance area.
            if (_demoFlashTimer) clearTimeout(_demoFlashTimer);
            _demoFlashTimer = setTimeout(() => {
              setRecentWin(null);
              const stacks = getStackedChips ? getStackedChips() : {};
              clearStackedChips?.();
              if (
                addFlyingChip &&
                stacks &&
                Object.keys(stacks).length > 0
              ) {
                dispatchReverseFlyToBalance({
                  stackedChips: stacks,
                  addFlyingChip,
                });
              }
            }, WIN_FLASH_DURATION_MS);
          }
        }
      }
      break;
    }

    case "RoundClosed":
    case "round_closed": {
      // Round fully settled — go back to waiting for next round.
      setRoundStatus("waiting");
      clearStackedChips?.();
      // Demo: clear bets + cards so the "WAITING FOR NEXT ROUND" state
      // is a clean board. For real wallet, the chip-fly-back animation
      // driven by RoundSettled (use-balance-ws.ts) clears placedBets,
      // and the next RoundStarted clears currentRound — don't preempt
      // either of those flows.
      if (token === "demo") {
        clearPlacedBets?.();
        setCurrentRound(null);
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
