"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GameProvider, useGame } from "@/lib/game-context";

const DEMO_BALANCE = 10000;

interface TestTable {
  id: string;
  name: string;
  external_game_id?: string;
}

function DemoConnections({ children }: { children: ReactNode }) {
  // F-06: demo mode has no `prg_session` cookie, so it cannot mint a
  // lobby ticket. We deliberately skip the WS connection here — the
  // demo UI is self-contained (local balance, local round state) and
  // does not require live round events from a real table.

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
  const [tables, setTables] = useState<TestTable[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/emulator/tables")
      .then((r) => r.json())
      .then((data) => {
        const raw: TestTable[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];
        // Only TEST- prefixed tables
        const test = raw.filter(
          (t) => (t.external_game_id || t.name || "").startsWith("TEST"),
        );
        setTables(test);
        if (test.length > 0) setSelectedTable(test[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#070a10" }}>
        <span style={{ color: "#6a7282", fontSize: 14 }}>Loading test tables...</span>
      </div>
    );
  }

  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#070a10" }}>
        <span style={{ color: "#fb2c36", fontSize: 14 }}>No TEST- tables found. Create one in Studio Settings.</span>
      </div>
    );
  }

  return (
    <GameProvider
      token="demo"
      gameId={selectedTable}
      lang="en"
      lobbyUrl={null}
      cashierUrl={null}
      key={selectedTable}
    >
      <DemoConnections>
        {/* Table selector — small dropdown, demo only */}
        <div
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{
            backgroundColor: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span style={{ color: "#6a7282", fontSize: 11 }}>Table:</span>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="rounded px-2 py-0.5 text-xs font-medium text-white outline-none"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 11,
            }}
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.external_game_id || t.name}
              </option>
            ))}
          </select>
          <span style={{ color: "#f0b100", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>DEMO</span>
        </div>
        {children}
      </DemoConnections>
    </GameProvider>
  );
}
