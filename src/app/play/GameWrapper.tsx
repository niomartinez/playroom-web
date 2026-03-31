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
  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#0a0f1a" }}>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Session Required</div>
          <div className="text-[#6a7282] mb-4">
            No session token provided. Please launch the game from your operator lobby.
          </div>
          <a href="/play/demo" className="px-6 py-2 rounded-lg font-semibold text-black" style={{ backgroundColor: "#f0b100" }}>
            Try Demo Mode
          </a>
        </div>
      </div>
    );
  }

  return (
    <GameProvider
      token={token}
      gameId={gameId}
      lang={lang}
      lobbyUrl={lobbyUrl}
      cashierUrl={cashierUrl}
    >
      <GameConnections>{children}</GameConnections>
    </GameProvider>
  );
}
