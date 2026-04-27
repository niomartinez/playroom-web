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
  clearPlacedBets: () => void;
  addFlyingChip: (chip: Omit<FlyingChip, "id" | "startedAt">) => void;
  removeFlyingChip: (id: string) => void;
  addStackedChip: (betCode: BetCode, denom: number) => void;
  clearStackedChips: () => void;
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

  const addPlacedBet = useCallback((bet: PlacedBet) => {
    setPlacedBets((prev) => [...prev, bet]);
  }, []);

  const clearPlacedBets = useCallback(() => {
    setPlacedBets([]);
  }, []);

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
    setTableName,
    setDealerName,
    setBalance,
    setRoundStatus,
    setCurrentRound,
    setRoads,
    setMainBetCounts,
    setSelectedChip,
    addPlacedBet,
    clearPlacedBets,
    addFlyingChip,
    removeFlyingChip,
    addStackedChip,
    clearStackedChips,
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
