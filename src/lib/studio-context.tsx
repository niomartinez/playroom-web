"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Roads, RoundStatus, CurrentRound } from "./game-context";
import { useAngelEye, type UseAngelEyeReturn } from "./use-angel-eye";

/* ------------------------------------------------------------------ */
/*  Studio-specific state                                              */
/* ------------------------------------------------------------------ */

export type TableStatus = "open" | "paused" | "closed";

export interface StudioState {
  /* Table / dealer config */
  tableId: string;
  tableName: string;
  dealerName: string;
  lang: string;
  soundEnabled: boolean;
  bettingTime: number; // seconds for betting window

  /* Table operational status */
  tableStatus: TableStatus;

  /* Live state (same shapes as game-context) */
  roundStatus: RoundStatus;
  currentRound: CurrentRound | null;
  roads: Roads;
  lastUpdated: string; // HH:MM:SS timestamp of last event

  /* Angel Eye shoe — single instance, shared by SettingsDialog (connect/
     disconnect/status UI) and DealingDialog (subscribes to card events).
     Lives on the provider so the serial connection persists across
     dialog open/close. */
  angelEye: UseAngelEyeReturn;

  /* Setters */
  setTableId: (id: string) => void;
  setTableName: (name: string) => void;
  setDealerName: (name: string) => void;
  setLang: (lang: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setBettingTime: (t: number) => void;
  setTableStatus: (s: TableStatus) => void;
  setRoundStatus: (s: SetStateAction<RoundStatus>) => void;
  setCurrentRound: (r: SetStateAction<CurrentRound | null>) => void;
  setRoads: (r: SetStateAction<Roads>) => void;
  setLastUpdated: (ts: string) => void;
}

const DEFAULT_ROADS: Roads = {
  beadRoad: [],
  bigRoad: [],
  playerWins: 0,
  bankerWins: 0,
  ties: 0,
};

const StudioContext = createContext<StudioState | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

interface StudioProviderProps {
  initialTableId?: string;
  initialTableName?: string;
  initialDealerName?: string;
  initialLang?: string;
  initialSoundEnabled?: boolean;
  children: ReactNode;
}

export function StudioProvider({
  initialTableId = "",
  initialTableName = "",
  initialDealerName = "",
  initialLang = "EN",
  initialSoundEnabled = true,
  children,
}: StudioProviderProps) {
  const [tableId, setTableId] = useState(initialTableId);
  const [tableName, setTableName] = useState(initialTableName);
  const [dealerName, setDealerName] = useState(initialDealerName);
  const [lang, setLang] = useState(initialLang);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [bettingTime, setBettingTime] = useState(15);
  const [tableStatus, setTableStatus] = useState<TableStatus>("open");
  const [roundStatus, setRoundStatus] = useState<RoundStatus>("waiting");
  const [currentRound, setCurrentRound] = useState<CurrentRound | null>(null);
  const [roads, setRoads] = useState<Roads>(DEFAULT_ROADS);
  const [lastUpdated, setLastUpdated] = useState("--:--:--");
  const angelEye = useAngelEye();

  const value: StudioState = {
    tableId,
    tableName,
    dealerName,
    lang,
    soundEnabled,
    bettingTime,
    tableStatus,
    roundStatus,
    currentRound,
    roads,
    lastUpdated,
    angelEye,
    setTableId,
    setTableName,
    setDealerName,
    setLang,
    setSoundEnabled,
    setBettingTime,
    setTableStatus,
    setRoundStatus,
    setCurrentRound,
    setRoads,
    setLastUpdated,
  };

  return <StudioContext value={value}>{children}</StudioContext>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useStudio(): StudioState {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error("useStudio must be used within a StudioProvider");
  }
  return ctx;
}
