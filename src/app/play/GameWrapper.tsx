"use client";

import { useEffect, type ReactNode } from "react";
import { GameProvider } from "@/lib/game-context";
import { useLobbyWs } from "@/lib/use-lobby-ws";
import { useBalanceWs } from "@/lib/use-balance-ws";
import { sendToParent, onParentMessage } from "@/lib/iframe-bridge";

/* ------------------------------------------------------------------ */
/*  Inner component that activates WebSocket hooks inside GameProvider */
/* ------------------------------------------------------------------ */

function GameConnections({ children }: { children: ReactNode }) {
  useLobbyWs();
  useBalanceWs();

  /* Send gameReady on mount, listen for parent commands */
  useEffect(() => {
    sendToParent("gameReady");

    const unsub = onParentMessage((event) => {
      if (event === "closeGame") {
        // Operator requested close — could navigate away
        window.close();
      }
    });

    return unsub;
  }, []);

  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/*  Wrapper that sets up context + connections                         */
/* ------------------------------------------------------------------ */

interface GameWrapperProps {
  token: string | null;
  gameId: string | null;
  lang: string;
  lobbyUrl: string | null;
  cashierUrl: string | null;
  children: ReactNode;
}

export default function GameWrapper({
  token,
  gameId,
  lang,
  lobbyUrl,
  cashierUrl,
  children,
}: GameWrapperProps) {
  // Allow demo mode without token — show the UI with mock data
  return (
    <GameProvider
      token={token || "demo"}
      gameId={gameId}
      lang={lang}
      lobbyUrl={lobbyUrl}
      cashierUrl={cashierUrl}
    >
      <GameConnections>{children}</GameConnections>
    </GameProvider>
  );
}
