"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { RoadEntry, Roads, RoundStatus, CurrentRound } from "./game-context";

/* ------------------------------------------------------------------ */
/*  Studio-specific state                                              */
/* ------------------------------------------------------------------ */

export interface StudioState {
  /* Table / dealer config */
  tableId: string;
  tableName: string;
  dealerName: string;
  lang: string;
  soundEnabled: boolean;

  /* Live state (same shapes as game-context) */
  roundStatus: RoundStatus;
  currentRound: CurrentRound | null;
  roads: Roads;
  lastUpdated: string; // HH:MM:SS timestamp of last event

  /* Setters */
  setTableId: (id: string) => void;
  setTableName: (name: string) => void;
  setDealerName: (name: string) => void;
  setLang: (lang: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
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
  const [roundStatus, setRoundStatus] = useState<RoundStatus>("waiting");
  const [currentRound, setCurrentRound] = useState<CurrentRound | null>(null);
  const [roads, setRoads] = useState<Roads>(DEFAULT_ROADS);
  const [lastUpdated, setLastUpdated] = useState("--:--:--");

  const value: StudioState = {
    tableId,
    tableName,
    dealerName,
    lang,
    soundEnabled,
    roundStatus,
    currentRound,
    roads,
    lastUpdated,
    setTableId,
    setTableName,
    setDealerName,
    setLang,
    setSoundEnabled,
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
