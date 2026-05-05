"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type SetStateAction,
} from "react";

/* ------------------------------------------------------------------ */
/*  Bet types                                                          */
/* ------------------------------------------------------------------ */

export type BetCode =
  | "BAC_Player"
  | "BAC_Banker"
  | "BAC_Tie"
  | "BAC_PlayerPair"
  | "BAC_BankerPair"
  | "BAC_EitherPair"
  | "BAC_PerfectPair";

export interface PlacedBet {
  betCode: BetCode;
  amount: number;
  /**
   * Optional transient client-side id for tracking optimistic placements
   * so they can be rolled back on server rejection.
   */
  id?: string;
}

/* ------------------------------------------------------------------ */
/*  Chip animation types                                               */
/* ------------------------------------------------------------------ */

export interface FlyingChip {
  /** Stable unique id for this in-flight chip */
  id: string;
  /** Chip denomination (matches /mobile-assets/chip-{denom}.png) */
  denom: number;
  /** Source coords (top-left) in viewport pixels */
  fromX: number;
  fromY: number;
  /** Destination coords (top-left) in viewport pixels */
  toX: number;
  toY: number;
  /** Bet code the chip is heading to (used to land into the stacked map) */
  betCode: BetCode;
  /** Timestamp the fly was dispatched */
  startedAt: number;
  /**
   * When true, the chip does NOT land into the per-bet stack on completion.
   * Used by the reverse-fly settlement animation where chips dissolve into
   * the balance area instead of accumulating somewhere new.
   */
  ephemeral?: boolean;
}

export interface StackedChip {
  id: string;
  denom: number;
}

/* ------------------------------------------------------------------ */
/*  Road data types                                                    */
/* ------------------------------------------------------------------ */

export interface RoadEntry {
  result: "P" | "B" | "T";
  playerPair?: boolean;
  bankerPair?: boolean;
}

export interface Roads {
  beadRoad: RoadEntry[];
  bigRoad: RoadEntry[];
  /** Score tallies */
  playerWins: number;
  bankerWins: number;
  ties: number;
}

/* ------------------------------------------------------------------ */
/*  Round data                                                         */
/* ------------------------------------------------------------------ */

export type RoundStatus =
  | "waiting"
  | "betting_open"
  | "dealing"
  | "result";

export interface CurrentRound {
  roundId: string | number;
  roundNumber: number | string;
  playerCards: string[];
  bankerCards: string[];
  playerScore: number;
  bankerScore: number;
  winner?: "P" | "B" | "T";
  countdown?: number;
}

/* ------------------------------------------------------------------ */
/*  Live main-bet aggregate counts (for the P/T/B bar)                  */
/* ------------------------------------------------------------------ */

export interface MainBetBucket {
  /** Unique players with at least one accepted main bet on this side */
  players: number;
  /** Total bet amount on this side this round */
  amount: number;
}

export interface MainBetCounts {
  /** External table id (game.external_game_id) the counts apply to */
  tableId: string;
  /** External round id (fight.external_fight_id) the counts apply to */
  roundId: string;
  Player: MainBetBucket;
  Tie: MainBetBucket;
  Banker: MainBetBucket;
}

/* ------------------------------------------------------------------ */
/*  Recent win (post-settlement YOU WON flash)                         */
/* ------------------------------------------------------------------ */

export interface RecentWinLine {
  /** Display label like "PERFECT PAIR" */
  label: string;
  /** Payoff amount (bet + winnings, as broadcast by the backend) */
  amount: number;
  /** Backend bet code -- used to source the chip-back-to-balance fly */
  betCode: BetCode | string;
}

export interface RecentWin {
  /** External fight id this settlement belongs to */
  fightId: string;
  /** Sum of all winning payoffs */
  totalPayoff: number;
  /** One line per WINNING bet */
  lines: RecentWinLine[];
}

/* ------------------------------------------------------------------ */
/*  Context shape                                                      */
/* ------------------------------------------------------------------ */

export interface GameState {
  /* URL params */
  token: string | null;
  gameId: string | null;
  lang: string;
  lobbyUrl: string | null;
  cashierUrl: string | null;

  /* Table info */
  tableName: string;
  dealerName: string;

  /* Live state */
  balance: number;
  roundStatus: RoundStatus;
  currentRound: CurrentRound | null;
  roads: Roads;
  mainBetCounts: MainBetCounts | null;

  /* Betting */
  selectedChip: number;
  placedBets: PlacedBet[];

  /* Chip animation */
  flyingChips: FlyingChip[];
  stackedChips: Record<string, StackedChip[]>;

  /* Settlement flash — set when a RoundSettled event arrives with winners */
  recentWin: RecentWin | null;

  /* Setters — accept direct values or functional updaters */
  setTableName: (n: string) => void;
  setDealerName: (n: string) => void;
  setBalance: (b: SetStateAction<number>) => void;
  setRoundStatus: (s: SetStateAction<RoundStatus>) => void;
  setCurrentRound: (r: SetStateAction<CurrentRound | null>) => void;
  setRoads: (r: SetStateAction<Roads>) => void;
  setMainBetCounts: (c: SetStateAction<MainBetCounts | null>) => void;
  setSelectedChip: (amount: number) => void;
  addPlacedBet: (bet: PlacedBet) => void;
  removePlacedBet: (id: string) => void;
  clearPlacedBets: () => void;
  cancelPlacedBets: () => void;
  addFlyingChip: (chip: Omit<FlyingChip, "id" | "startedAt">) => void;
  removeFlyingChip: (id: string) => void;
  addStackedChip: (betCode: BetCode, denom: number) => void;
  clearStackedChips: () => void;
  setRecentWin: (w: RecentWin | null) => void;
}

const DEFAULT_ROADS: Roads = {
  beadRoad: [],
  bigRoad: [],
  playerWins: 0,
  bankerWins: 0,
  ties: 0,
};

const GameContext = createContext<GameState | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

interface GameProviderProps {
  token: string | null;
  gameId: string | null;
  lang: string;
  lobbyUrl: string | null;
  cashierUrl: string | null;
  children: ReactNode;
}

export function GameProvider({
  token,
  gameId,
  lang,
  lobbyUrl,
  cashierUrl,
  children,
}: GameProviderProps) {
  const [tableName, setTableName] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!gameId) return;
    fetch("/api/emulator/tables")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const t = list.find(
          (x: { id: string; external_game_id?: string }) =>
            x.external_game_id === gameId || x.id === gameId,
        );
        if (t?.name) setTableName(t.name);
        if (t?.dealer_name) setDealerName(t.dealer_name);
      })
      .catch(() => {});
  }, [gameId]);
  const [roundStatus, setRoundStatus] = useState<RoundStatus>("waiting");
  const [currentRound, setCurrentRound] = useState<CurrentRound | null>(null);
  const [roads, setRoads] = useState<Roads>(DEFAULT_ROADS);
  const [mainBetCounts, setMainBetCounts] = useState<MainBetCounts | null>(null);
  const [selectedChip, setSelectedChip] = useState(100);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [flyingChips, setFlyingChips] = useState<FlyingChip[]>([]);
  const [stackedChips, setStackedChips] = useState<Record<string, StackedChip[]>>({});
  const [recentWin, setRecentWin] = useState<RecentWin | null>(null);

  const addPlacedBet = useCallback((bet: PlacedBet) => {
    setPlacedBets((prev) => [...prev, bet]);
  }, []);

  const removePlacedBet = useCallback((id: string) => {
    setPlacedBets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const clearPlacedBets = useCallback(() => {
    setPlacedBets([]);
  }, []);

  /**
   * User-initiated cancel during the betting phase (the CLEAR BETS
   * pill on the BalanceBar). Distinct from `clearPlacedBets` which is
   * used by post-round cleanup hooks (no refund there — settlement
   * already happened).
   *
   * Demo: refunds the local balance for the cancelled bets and clears
   * the visual chip stacks so the buttons go back to empty.
   *
   * Real wallet: calls /api/bet/void to ask the backend to refund
   * optimistically-debited bets on the active fight (transfer-mode
   * does an atomic SQL refund; seamless-mode issues per-bet wallet
   * /cancel calls). UI clears optimistically; on server failure the
   * placed-bets array is restored so the player can retry.
   */
  const cancelPlacedBets = useCallback(() => {
    if (token === "demo") {
      setPlacedBets((current) => {
        if (current.length > 0) {
          const refund = current.reduce((sum, b) => sum + b.amount, 0);
          if (refund > 0) {
            setBalance((b) => b + refund);
          }
          setStackedChips({});
        }
        return [];
      });
    } else {
      // Real wallet: ask backend to void all accepted bets on the active
      // fight, refund through the wallet (transfer or seamless cancel).
      const fightId = currentRound?.roundId;
      if (!fightId) {
        // No active round — nothing to void server-side; just clear local UI.
        setPlacedBets([]);
        setStackedChips({});
        return;
      }
      const snapshot = placedBets;
      // Optimistic clear so the UI feels instant.
      setPlacedBets([]);
      setStackedChips({});
      console.info("[cancelPlacedBets] POST /api/bet/void", { fight_id: fightId });
      fetch("/api/bet/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fight_id: String(fightId) }),
        credentials: "same-origin",
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          console.info("[cancelPlacedBets] response", r.status, data);
          if (!r.ok) {
            // If the round already moved past betting (status: dealing/result),
            // the bets are still live and will settle normally — restoring the
            // snapshot is the correct UX so the user sees their stake.
            if (data?.error_code === "1007") {
              setPlacedBets(snapshot);
              setStackedChips({});
              return;
            }
            // Other failures (auth, network, etc.): also restore so the
            // user can retry. Surface the error so it shows up in DevTools
            // console for diagnosis.
            console.error(
              "[cancelPlacedBets] void failed",
              r.status,
              data?.message || data?.error || "(no message)",
            );
            setPlacedBets(snapshot);
            return;
          }
          const balanceAfter = data?.data?.balance_after;
          if (typeof balanceAfter === "number") {
            setBalance(balanceAfter);
          }
        })
        .catch((err) => {
          console.error("[cancelPlacedBets] fetch threw", err);
          setPlacedBets(snapshot);
        });
    }
  }, [token, currentRound, placedBets, setBalance, setPlacedBets, setStackedChips]);

  const addFlyingChip = useCallback(
    (chip: Omit<FlyingChip, "id" | "startedAt">) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `chip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setFlyingChips((prev) => [
        ...prev,
        { ...chip, id, startedAt: Date.now() },
      ]);
    },
    [],
  );

  const removeFlyingChip = useCallback((id: string) => {
    setFlyingChips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addStackedChip = useCallback((betCode: BetCode, denom: number) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `stack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setStackedChips((prev) => ({
      ...prev,
      [betCode]: [...(prev[betCode] ?? []), { id, denom }],
    }));
  }, []);

  const clearStackedChips = useCallback(() => {
    setStackedChips({});
  }, []);

  const value: GameState = {
    token,
    gameId,
    lang,
    lobbyUrl,
    cashierUrl,
    tableName,
    dealerName,
    balance,
    roundStatus,
    currentRound,
    roads,
    mainBetCounts,
    selectedChip,
    placedBets,
    flyingChips,
    stackedChips,
    recentWin,
    setTableName,
    setDealerName,
    setBalance,
    setRoundStatus,
    setCurrentRound,
    setRoads,
    setMainBetCounts,
    setSelectedChip,
    addPlacedBet,
    removePlacedBet,
    clearPlacedBets,
    cancelPlacedBets,
    addFlyingChip,
    removeFlyingChip,
    addStackedChip,
    clearStackedChips,
    setRecentWin,
  };

  return <GameContext value={value}>{children}</GameContext>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useGame(): GameState {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return ctx;
}
