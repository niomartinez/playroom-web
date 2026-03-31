"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { GameProvider, useGame } from "@/lib/game-context";
import { useLobbyWs } from "@/lib/use-lobby-ws";

const DEMO_BALANCE = 10000;
const DEMO_TABLE = "8a65e8e6-f373-47ad-bb7f-b583e59e7be1"; // Baccarat Table 1

function DemoConnections({ children }: { children: ReactNode }) {
  useLobbyWs();

  const { setBalance } = useGame();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setBalance(DEMO_BALANCE);
    }
  }, [setBalance]);

  return <>{children}</>;
}

export default function DemoWrapper({ children }: { children: ReactNode }) {
  return (
    <GameProvider
      token="demo"
      gameId={DEMO_TABLE}
      lang="en"
      lobbyUrl={null}
      cashierUrl={null}
    >
      <DemoConnections>{children}</DemoConnections>
    </GameProvider>
  );
}
