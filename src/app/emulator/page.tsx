"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ---------- types ---------- */

interface Card {
  rank: string;
  suit: string;
}

interface RoundResult {
  outcome: "banker" | "player" | "tie";
  player_cards: Card[];
  banker_cards: Card[];
  player_score: number;
  banker_score: number;
  player_pair: boolean;
  banker_pair: boolean;
}

interface HistoryEntry extends RoundResult {
  round: number;
}

interface Table {
  id: string;
  name: string;
  external_game_id?: string;
}

/* ---------- constants ---------- */

const OUTCOME_COLORS: Record<string, string> = {
  banker: "#fb2c36",
  player: "#2b7fff",
  tie: "#00bc7d",
};

const OUTCOME_LABELS: Record<string, string> = {
  banker: "BANKER WINS",
  player: "PLAYER WINS",
  tie: "TIE",
};

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
  H: "\u2665",
  D: "\u2666",
  C: "\u2663",
  S: "\u2660",
};

const SUIT_COLORS: Record<string, string> = {
  hearts: "#fb2c36",
  diamonds: "#fb2c36",
  clubs: "#ffffff",
  spades: "#ffffff",
  H: "#fb2c36",
  D: "#fb2c36",
  C: "#ffffff",
  S: "#ffffff",
};

const BETTING_OPTIONS = [0, 10, 15, 20, 25, 30];

/** Estimate total round time: betting + card reveals (~9s) + result display (5s) + buffer */
function estimateRoundTime(bettingTime: number): number {
  if (bettingTime === 0) return 1000;
  return (bettingTime + 9 + 5 + 3) * 1000;
}

/* ---------- small components ---------- */

function CardDisplay({ card }: { card: Card }) {
  const symbol = SUIT_SYMBOLS[card.suit] || card.suit;
  const color = SUIT_COLORS[card.suit] || "#ffffff";

  return (
    <div
      className="flex items-center justify-center rounded-md font-bold"
      style={{
        width: 52,
        height: 72,
        backgroundColor: "#1a1a2e",
        border: "1px solid rgba(255,255,255,0.15)",
        fontSize: 18,
        gap: 2,
      }}
    >
      <span className="text-white">{card.rank === "T" ? "10" : card.rank}</span>
      <span style={{ color }}>{symbol}</span>
    </div>
  );
}

function StatusDot({ status }: { status: "ready" | "dealing" | "error" }) {
  const color =
    status === "dealing"
      ? "#f0b100"
      : status === "error"
        ? "#fb2c36"
        : "#00bc7d";

  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{
        backgroundColor: color,
        boxShadow: status === "dealing" ? `0 0 8px ${color}` : undefined,
        animation: status === "dealing" ? "pulse 1.2s infinite" : undefined,
      }}
    />
  );
}

/* ---------- main page ---------- */

export default function EmulatorPage() {
  /* state */
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [autoDeal, setAutoDeal] = useState(false);
  const [bettingTime, setBettingTime] = useState(15);
  const [pauseBetween, setPauseBetween] = useState(5); // seconds between rounds
  const [status, setStatus] = useState<"ready" | "dealing" | "error">("ready");
  const [roundCount, setRoundCount] = useState(0);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [flash, setFlash] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundRef = useRef(0);

  /* fetch tables on mount */
  useEffect(() => {
    fetch("/api/emulator/tables")
      .then((r) => r.json())
      .then((data) => {
        const raw: Table[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.tables)
              ? data.tables
              : [];
        // Show all tables — backend enforces TEST-only restriction in production
        const list = raw;
        setTables(list);
        if (list.length > 0) setSelectedTable(list[0].id);
      })
      .catch(() => {
        /* tables may not be available yet */
      });

    // Load recent round history from bridge/status
    fetch("/api/emulator/history")
      .then((r) => r.json())
      .then((data) => {
        const recent = data?.recent_rounds || [];
        const loaded: HistoryEntry[] = recent.map((r: Record<string, unknown>, i: number) => ({
          round: recent.length - i,
          outcome: ((r.result as string) || "").toLowerCase() as RoundResult["outcome"],
          player_score: (r.player as number) ?? 0,
          banker_score: (r.banker as number) ?? 0,
          player_cards: [],
          banker_cards: [],
          player_pair: false,
          banker_pair: false,
        }));
        setHistory(loaded);
        roundRef.current = data?.total_rounds || loaded.length;
        setRoundCount(roundRef.current);
      })
      .catch(() => {});
  }, []);

  /* Shared handler: extracts RoundResult from backend response, throws on error_code */
  const processDealResponse = (json: Record<string, unknown>): RoundResult => {
    if (json.error_code || json.error) {
      throw new Error(
        (json.message as string) ||
          (json.error as string) ||
          `error_code=${json.error_code}`
      );
    }
    const raw = (json.data as Record<string, unknown>) || json;
    return {
      ...(raw as unknown as RoundResult),
      outcome: ((raw.outcome as string) || "").toLowerCase() as RoundResult["outcome"],
      player_cards: ((raw.player_cards as (string | Card)[]) || []).map((c) =>
        typeof c === "string" ? { rank: c.slice(0, -1), suit: c.slice(-1) } : c
      ),
      banker_cards: ((raw.banker_cards as (string | Card)[]) || []).map((c) =>
        typeof c === "string" ? { rank: c.slice(0, -1), suit: c.slice(-1) } : c
      ),
    };
  };

  /* deal one round */
  /* Deal cards for the active round (simulates Angel Eye shoe) */
  const dealShoe = useCallback(async () => {
    if (!selectedTable) return;
    setStatus("dealing");
    setErrorMsg("");

    try {
      const res = await fetch("/api/emulator/shoe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: selectedTable }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const data = processDealResponse(json);
      roundRef.current += 1;
      const round = roundRef.current;

      setRoundCount(round);
      setLastResult(data);
      setHistory((prev) => [{ ...data, round }, ...prev].slice(0, 20));
      setStatus("ready");

      /* flash effect */
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
    }
  }, [selectedTable]);

  /* Full auto-deal: starts round + deals (standalone, for automated testing) */
  const dealFullRound = useCallback(async () => {
    if (!selectedTable) return;
    setStatus("dealing");
    setErrorMsg("");

    try {
      /* If studio has a round already waiting for cards, use shoe instead of starting a new round. */
      const shoeRes = await fetch("/api/emulator/shoe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: selectedTable }),
      });
      let json: Record<string, unknown> = await shoeRes.json().catch(() => ({}));

      const noActiveRound =
        json.error_code === "ROUND_NOT_FOUND" ||
        (typeof json.message === "string" &&
          json.message.toLowerCase().includes("no active round"));

      if (noActiveRound) {
        const res = await fetch("/api/emulator/deal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_id: selectedTable, betting_time: bettingTime }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.detail || `HTTP ${res.status}`);
        }
        json = await res.json();
      } else if (!shoeRes.ok) {
        throw new Error((json.error as string) || `HTTP ${shoeRes.status}`);
      }

      const data = processDealResponse(json);
      roundRef.current += 1;
      const round = roundRef.current;
      setRoundCount(round);
      setLastResult(data);
      setHistory((prev) => [{ ...data, round }, ...prev].slice(0, 20));
      setStatus("ready");
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Unknown error");
    }
  }, [selectedTable, bettingTime]);

  /* auto-deal: starts round + deals (standalone, for automated testing) */
  const dealingRef = useRef(false);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    dealingRef.current = false;

    if (autoDeal && selectedTable) {
      const roundTime = estimateRoundTime(bettingTime);
      const totalInterval = roundTime + pauseBetween * 1000;

      const runDeal = async () => {
        if (dealingRef.current) return; // prevent overlap
        dealingRef.current = true;
        await dealFullRound();
        dealingRef.current = false;
      };

      runDeal();
      intervalRef.current = setInterval(runDeal, totalInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoDeal, bettingTime, pauseBetween, selectedTable, dealFullRound]);

  /* ---------- render ---------- */
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: "linear-gradient(to right, #000000, #171717, #000000)",
      }}
    >
      {/* pulse animation */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      {/* ===== HEADER ===== */}
      <header
        className="shrink-0 flex items-center justify-between px-6"
        style={{
          height: 62,
          background:
            "linear-gradient(to right, #000000 0%, #171717 50%, #000000 100%)",
          borderBottom: "1px solid rgba(208,135,0,0.3)",
          boxShadow:
            "0px 10px 15px rgba(208,135,0,0.2), 0px 4px 6px rgba(208,135,0,0.2)",
        }}
      >
        <div className="flex items-center gap-4">
          <div style={{ width: 120, height: 64 }}>
            <img
              src="/logo.png"
              alt="Play Room Gaming"
              className="w-full h-full object-contain"
            />
          </div>
          <h1
            className="font-semibold tracking-wide"
            style={{ fontSize: 18, color: "#d08700" }}
          >
            Angel Eye Emulator
          </h1>
        </div>

        {/* Table selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: "#99a1af" }}>
            Table:
          </label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="rounded px-3 py-1.5 text-sm font-medium text-white outline-none"
            style={{
              backgroundColor: "#1a1a2e",
              border: "1px solid rgba(208,135,0,0.3)",
              minWidth: 180,
            }}
          >
            {tables.length === 0 && <option value="">No tables found</option>}
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.id}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ===== CONTROLS PANEL ===== */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-3"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Left: Auto deal + speed */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoDeal((prev) => !prev)}
            className="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: autoDeal ? "#d08700" : "#1a1a2e",
              color: autoDeal ? "#000" : "#fff",
              border: "1px solid rgba(208,135,0,0.3)",
            }}
          >
            Auto Deal {autoDeal ? "ON" : "OFF"}
          </button>

          {/* Betting window selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs mr-1" style={{ color: "#6a7282" }}>Bet window:</span>
            {BETTING_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setBettingTime(t)}
                className="rounded px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: bettingTime === t ? "rgba(208,135,0,0.25)" : "rgba(255,255,255,0.05)",
                  color: bettingTime === t ? "#d08700" : "#99a1af",
                  border:
                    bettingTime === t
                      ? "1px solid rgba(208,135,0,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {t === 0 ? "Instant" : `${t}s`}
              </button>
            ))}
          </div>

          {/* Pause between rounds (for auto-deal) */}
          <div className="flex items-center gap-1">
            <span className="text-xs mr-1" style={{ color: "#6a7282" }}>Pause:</span>
            {[0, 3, 5, 10].map((t) => (
              <button
                key={t}
                onClick={() => setPauseBetween(t)}
                className="rounded px-2 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: pauseBetween === t ? "rgba(43,127,255,0.25)" : "rgba(255,255,255,0.05)",
                  color: pauseBetween === t ? "#2b7fff" : "#99a1af",
                  border:
                    pauseBetween === t
                      ? "1px solid rgba(43,127,255,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {t === 0 ? "None" : `${t}s`}
              </button>
            ))}
          </div>

          <button
            onClick={dealShoe}
            disabled={!selectedTable || status === "dealing"}
            className="rounded-md px-5 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor:
                !selectedTable || status === "dealing"
                  ? "rgba(255,255,255,0.05)"
                  : "#2b7fff",
              color:
                !selectedTable || status === "dealing" ? "#6a7282" : "#fff",
              cursor:
                !selectedTable || status === "dealing"
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            🃏 Deal Cards
          </button>
        </div>

        {/* Right: Counter + status */}
        <div className="flex items-center gap-6">
          <span className="text-sm" style={{ color: "#99a1af" }}>
            Rounds dealt:{" "}
            <span className="font-semibold text-white">{roundCount}</span>
          </span>
          <div className="flex items-center gap-2">
            <StatusDot status={status} />
            <span
              className="text-sm font-medium"
              style={{
                color:
                  status === "dealing"
                    ? "#f0b100"
                    : status === "error"
                      ? "#fb2c36"
                      : "#00bc7d",
              }}
            >
              {status === "dealing"
                ? "Dealing..."
                : status === "error"
                  ? "Error"
                  : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div
          className="shrink-0 px-6 py-2 text-sm"
          style={{ backgroundColor: "rgba(251,44,54,0.1)", color: "#fb2c36" }}
        >
          {errorMsg}
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 min-h-0 flex flex-col">
        {/* Last Round Result */}
        <div
          className="flex-1 min-h-0 flex items-center justify-center"
          style={{ padding: "16px 24px" }}
        >
          {lastResult ? (
            <div
              className="rounded-xl w-full h-full flex flex-col items-center justify-center gap-5"
              style={{
                background: "linear-gradient(123deg, #171717 0%, #000000 100%)",
                border: "1px solid rgba(208,135,0,0.3)",
                boxShadow:
                  "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
                transition: "box-shadow 0.3s",
                ...(flash
                  ? {
                      boxShadow: `0 0 40px ${OUTCOME_COLORS[lastResult.outcome]}44, 0 0 80px ${OUTCOME_COLORS[lastResult.outcome]}22`,
                    }
                  : {}),
              }}
            >
              {/* Outcome label */}
              <div
                className="font-bold tracking-widest"
                style={{
                  fontSize: "clamp(28px, 4vw, 48px)",
                  color: OUTCOME_COLORS[lastResult.outcome],
                  textShadow: flash
                    ? `0 0 20px ${OUTCOME_COLORS[lastResult.outcome]}88`
                    : "none",
                  transition: "text-shadow 0.3s",
                }}
              >
                {OUTCOME_LABELS[lastResult.outcome] || lastResult.outcome.toUpperCase()}
              </div>

              {/* Cards + Scores row */}
              <div className="flex items-start gap-12">
                {/* Player */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold tracking-wider"
                      style={{ color: "#2b7fff" }}
                    >
                      PLAYER
                    </span>
                    <span
                      className="font-bold"
                      style={{
                        fontSize: 28,
                        color: "#2b7fff",
                      }}
                    >
                      {lastResult.player_score}
                    </span>
                    {lastResult.player_pair && (
                      <span
                        className="text-xs font-bold rounded px-1.5 py-0.5"
                        style={{
                          backgroundColor: "rgba(43,127,255,0.2)",
                          color: "#2b7fff",
                          border: "1px solid rgba(43,127,255,0.4)",
                        }}
                      >
                        PAIR
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {lastResult.player_cards.map((c, i) => (
                      <CardDisplay key={i} card={c} />
                    ))}
                  </div>
                </div>

                {/* VS divider */}
                <div
                  className="flex items-center justify-center font-bold"
                  style={{
                    color: "#6a7282",
                    fontSize: 14,
                    paddingTop: 28,
                  }}
                >
                  VS
                </div>

                {/* Banker */}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold tracking-wider"
                      style={{ color: "#fb2c36" }}
                    >
                      BANKER
                    </span>
                    <span
                      className="font-bold"
                      style={{
                        fontSize: 28,
                        color: "#fb2c36",
                      }}
                    >
                      {lastResult.banker_score}
                    </span>
                    {lastResult.banker_pair && (
                      <span
                        className="text-xs font-bold rounded px-1.5 py-0.5"
                        style={{
                          backgroundColor: "rgba(251,44,54,0.2)",
                          color: "#fb2c36",
                          border: "1px solid rgba(251,44,54,0.4)",
                        }}
                      >
                        PAIR
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {lastResult.banker_cards.map((c, i) => (
                      <CardDisplay key={i} card={c} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div
              className="rounded-xl w-full h-full flex flex-col items-center justify-center"
              style={{
                background: "linear-gradient(123deg, #171717 0%, #000000 100%)",
                border: "1px solid rgba(208,135,0,0.3)",
                boxShadow:
                  "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
              }}
            >
              <div style={{ color: "#6a7282", fontSize: 16 }}>
                Select a table and click{" "}
                <span className="font-semibold text-white">Deal Now</span> or
                enable{" "}
                <span className="font-semibold" style={{ color: "#d08700" }}>
                  Auto Deal
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ===== ROUND HISTORY ===== */}
        <div
          className="shrink-0 flex flex-col"
          style={{
            height: "32vh",
            padding: "0 24px 16px",
          }}
        >
          <div
            className="text-xs font-semibold tracking-wider mb-2"
            style={{ color: "#d08700" }}
          >
            ROUND HISTORY
          </div>

          <div
            className="flex-1 min-h-0 rounded-lg overflow-hidden flex flex-col"
            style={{
              border: "1px solid rgba(208,135,0,0.3)",
              background: "linear-gradient(123deg, #171717 0%, #000000 100%)",
            }}
          >
            {/* Table header */}
            <div
              className="shrink-0 grid text-xs font-semibold tracking-wider px-4 py-2"
              style={{
                gridTemplateColumns: "60px 140px 80px 80px 1fr 1fr",
                color: "#6a7282",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span>#</span>
              <span>OUTCOME</span>
              <span>P SCORE</span>
              <span>B SCORE</span>
              <span>PLAYER CARDS</span>
              <span>BANKER CARDS</span>
            </div>

            {/* Scrollable rows */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {history.length === 0 ? (
                <div
                  className="flex items-center justify-center h-full text-sm"
                  style={{ color: "#6a7282" }}
                >
                  No rounds dealt yet
                </div>
              ) : (
                history.map((entry, idx) => (
                  <div
                    key={entry.round}
                    className="grid items-center px-4 py-2 text-sm"
                    style={{
                      gridTemplateColumns: "60px 140px 80px 80px 1fr 1fr",
                      backgroundColor:
                        idx % 2 === 0
                          ? "rgba(255,255,255,0.02)"
                          : "transparent",
                    }}
                  >
                    <span style={{ color: "#99a1af" }}>{entry.round}</span>
                    <span
                      className="font-semibold"
                      style={{ color: OUTCOME_COLORS[entry.outcome] }}
                    >
                      {OUTCOME_LABELS[entry.outcome] || entry.outcome}
                      {entry.player_pair && (
                        <span
                          className="ml-2 text-xs"
                          style={{ color: "#2b7fff" }}
                        >
                          PP
                        </span>
                      )}
                      {entry.banker_pair && (
                        <span
                          className="ml-1 text-xs"
                          style={{ color: "#fb2c36" }}
                        >
                          BP
                        </span>
                      )}
                    </span>
                    <span className="font-bold" style={{ color: "#2b7fff" }}>
                      {entry.player_score}
                    </span>
                    <span className="font-bold" style={{ color: "#fb2c36" }}>
                      {entry.banker_score}
                    </span>
                    <span style={{ color: "#99a1af" }}>
                      {entry.player_cards
                        .map(
                          (c) =>
                            `${c.rank}${SUIT_SYMBOLS[c.suit] || c.suit}`
                        )
                        .join("  ")}
                    </span>
                    <span style={{ color: "#99a1af" }}>
                      {entry.banker_cards
                        .map(
                          (c) =>
                            `${c.rank}${SUIT_SYMBOLS[c.suit] || c.suit}`
                        )
                        .join("  ")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
