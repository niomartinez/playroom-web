"use client";

import { useEffect, useState, type ReactNode } from "react";
import { StudioProvider } from "@/lib/studio-context";
import { useStudioWs } from "@/lib/use-studio-ws";
import { useStudioStateRecovery } from "@/lib/use-studio-state-recovery";

/* ------------------------------------------------------------------ */
/*  Inner component that activates WebSocket hook inside StudioProvider */
/* ------------------------------------------------------------------ */

function StudioConnections({ children }: { children: ReactNode }) {
  useStudioWs();
  // One-shot fetch on mount: rehydrates round status + cards + countdown
  // if the studio dashboard is refreshed during a live round.
  useStudioStateRecovery();
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/*  Wrapper that reads localStorage config and sets up context         */
/* ------------------------------------------------------------------ */

export default function StudioWrapper({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<{
    tableId: string;
    tableName: string;
    dealerName: string;
    lang: string;
    soundEnabled: boolean;
  } | null>(null);

  useEffect(() => {
    // Read persisted config from localStorage. Wrapped in try/catch: some
    // in-app browsers (Messenger/Telegram webviews, private mode) throw on
    // localStorage access. Without this guard the throw aborts the effect,
    // setConfig never runs, and the page hangs forever on "Loading studio…".
    // Fall back to defaults so the studio still opens.
    let cfg = { tableId: "", tableName: "", dealerName: "", lang: "EN", soundEnabled: true };
    try {
      cfg = {
        tableId: localStorage.getItem("selectedTableId") || "",
        tableName: localStorage.getItem("selectedTableName") || "",
        dealerName: localStorage.getItem("dealerName") || "",
        lang: localStorage.getItem("studioLang") || "EN",
        soundEnabled: localStorage.getItem("studioSound") !== "off",
      };
    } catch {
      /* storage unavailable — use defaults; dealer can set table in Settings */
    }
    setConfig(cfg);
  }, []);

  // Show nothing until localStorage is read (prevents hydration mismatch)
  if (!config) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: "linear-gradient(to right, #000000, #171717, #000000)" }}
      >
        <div className="text-[#6a7282] text-sm">Loading studio...</div>
      </div>
    );
  }

  return (
    <StudioProvider
      initialTableId={config.tableId}
      initialTableName={config.tableName}
      initialDealerName={config.dealerName}
      initialLang={config.lang}
      initialSoundEnabled={config.soundEnabled}
    >
      <StudioConnections>{children}</StudioConnections>
    </StudioProvider>
  );
}
