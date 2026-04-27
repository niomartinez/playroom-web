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

  /* Betting */
  selectedChip: number;
  placedBets: PlacedBet[];

  /* Setters — accept direct values or functional updaters */
  setTableName: (n: string) => void;
  setDealerName: (n: string) => void;
  setBalance: (b: SetStateAction<number>) => void;
  setRoundStatus: (s: SetStateAction<RoundStatus>) => void;
  setCurrentRound: (r: SetStateAction<CurrentRound | null>) => void;
  setRoads: (r: SetStateAction<Roads>) => void;
  setSelectedChip: (amount: number) => void;
  addPlacedBet: (bet: PlacedBet) => void;
  clearPlacedBets: () => void;
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
  const [selectedChip, setSelectedChip] = useState(100);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);

  const addPlacedBet = useCallback((bet: PlacedBet) => {
    setPlacedBets((prev) => [...prev, bet]);
  }, []);

  const clearPlacedBets = useCallback(() => {
    setPlacedBets([]);
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
    selectedChip,
    placedBets,
    setTableName,
    setDealerName,
    setBalance,
    setRoundStatus,
    setCurrentRound,
    setRoads,
    setSelectedChip,
    addPlacedBet,
    clearPlacedBets,
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
