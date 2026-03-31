"use client";

import { useEffect, useState, type ReactNode } from "react";
import { StudioProvider } from "@/lib/studio-context";
import { useStudioWs } from "@/lib/use-studio-ws";

/* ------------------------------------------------------------------ */
/*  Inner component that activates WebSocket hook inside StudioProvider */
/* ------------------------------------------------------------------ */

function StudioConnections({ children }: { children: ReactNode }) {
  useStudioWs();
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
    // Read persisted config from localStorage
    const tableId = localStorage.getItem("selectedTableId") || "";
    const tableName = localStorage.getItem("selectedTableName") || "";
    const dealerName = localStorage.getItem("dealerName") || "";
    const lang = localStorage.getItem("studioLang") || "EN";
    const soundEnabled = localStorage.getItem("studioSound") !== "off";

    setConfig({ tableId, tableName, dealerName, lang, soundEnabled });
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
