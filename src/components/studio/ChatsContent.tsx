"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStudio } from "@/lib/studio-context";
import { clientFetch } from "@/lib/api";
import { isProdEnv } from "@/lib/server-env";
import { fmtDateTime } from "@/lib/chat-ui";
import { useStudioChatMonitor } from "@/lib/use-studio-chat-monitor";
import type { ChatMessage } from "@/lib/use-chat-ws";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TableOption {
  id: string;
  name: string;
  external_game_id?: string;
  is_active?: boolean;
}

interface MonitorSnapshot {
  messages: ChatMessage[];
  presence: number;
  connected: boolean;
}

const EMPTY_SNAPSHOT: MonitorSnapshot = {
  messages: [],
  presence: 0,
  connected: false,
};

/* ------------------------------------------------------------------ */
/*  Per-table monitor — mounts one WS per table, reports snapshots up  */
/* ------------------------------------------------------------------ */

function TableMonitor({
  extId,
  onSnapshot,
}: {
  extId: string;
  onSnapshot: (extId: string, snap: MonitorSnapshot) => void;
}) {
  const { messages, presence, connected } = useStudioChatMonitor(extId);
  useEffect(() => {
    onSnapshot(extId, { messages, presence, connected });
  }, [extId, messages, presence, connected, onSnapshot]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Main view                                                         */
/* ------------------------------------------------------------------ */

export default function ChatsContent() {
  const studio = useStudio();

  const [tables, setTables] = useState<TableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExtId, setActiveExtId] = useState<string>("");

  // Live per-table snapshots reported by the mounted TableMonitors.
  const [monitors, setMonitors] = useState<Record<string, MonitorSnapshot>>({});
  // Ids already "seen" per table — everything present when a table is first
  // observed or last selected is seen; new live ids after that are unread.
  const baselineRef = useRef<Record<string, Set<string>>>({});
  const activeRef = useRef<string>("");
  activeRef.current = activeExtId;

  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* ---- Load the env-filtered table list (mirrors SettingsDialog) ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await clientFetch("/api/emulator/tables");
        const raw: TableOption[] = Array.isArray(data)
          ? data
          : data.data ?? data.tables ?? [];
        const prod = isProdEnv();
        const PROD_TABLES = ["BAC-TABLE-01", "BAC-TABLE-02"];
        const list = raw.filter((t) => {
          if (t.is_active === false) return false;
          const ext = (t.external_game_id || "").toUpperCase();
          return prod
            ? PROD_TABLES.includes(t.external_game_id || "")
            : ext.startsWith("TEST-");
        });
        if (!cancelled) setTables(list);
      } catch {
        // silently fail; user sees empty list
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Default selection: ?table= or studio.tableId, matched against the
         table UUID OR external_game_id → resolve to external_game_id. ---- */
  useEffect(() => {
    if (!tables.length || activeExtId) return;
    let want = "";
    try {
      want = new URLSearchParams(window.location.search).get("table") || "";
    } catch {
      /* ignore */
    }
    if (!want) want = studio.tableId || "";
    const match =
      tables.find((t) => t.id === want || t.external_game_id === want) ??
      tables[0];
    const ext = match?.external_game_id || match?.id || "";
    if (ext) setActiveExtId(ext);
  }, [tables, activeExtId, studio.tableId]);

  /* ---- Snapshot handler from the per-table monitors ---- */
  const handleSnapshot = useCallback(
    (extId: string, snap: MonitorSnapshot) => {
      const ids = new Set(snap.messages.map((m) => m.id));
      const base = baselineRef.current;
      if (!base[extId]) {
        // First observation — treat existing history as already seen.
        base[extId] = ids;
      } else if (extId === activeRef.current) {
        // Active table: everything is seen, keep the baseline current so
        // switching away later only counts genuinely newer lines.
        base[extId] = ids;
      }
      setMonitors((prev) => ({ ...prev, [extId]: snap }));
    },
    [],
  );

  /* ---- Select a table (clears its unread badge) ---- */
  const selectTable = useCallback((extId: string) => {
    setActiveExtId(extId);
    // Mark every line currently buffered for this table as seen so its
    // unread badge resets to zero on select. Read the latest snapshot via
    // the state updater to avoid a stale closure.
    setMonitors((prev) => {
      const cur = prev[extId];
      baselineRef.current[extId] = new Set(
        (cur?.messages ?? []).map((m) => m.id),
      );
      return prev;
    });
  }, []);

  const activeSnap = monitors[activeExtId] ?? EMPTY_SNAPSHOT;
  const activeMessages = activeSnap.messages;

  /* ---- Unread counts per table (0 for the active one) ---- */
  const unread = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of tables) {
      const ext = t.external_game_id || t.id;
      if (ext === activeExtId) {
        out[ext] = 0;
        continue;
      }
      const snap = monitors[ext];
      const base = baselineRef.current[ext];
      if (!snap || !base) {
        out[ext] = 0;
        continue;
      }
      out[ext] = snap.messages.reduce(
        (n, m) => (base.has(m.id) ? n : n + 1),
        0,
      );
    }
    return out;
  }, [tables, monitors, activeExtId]);

  /* ---- Auto-scroll to newest on the active table ---- */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeMessages, activeExtId]);

  const activeTable = tables.find(
    (t) => (t.external_game_id || t.id) === activeExtId,
  );

  /* ---- Styling tokens (match StudioHeader / SettingsDialog) ---- */
  const panelBg = "linear-gradient(135deg, #171717 0%, #000000 100%)";

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "linear-gradient(to right, #000000, #171717, #000000)" }}
    >
      {/* Mount one hidden monitor per table so unread badges track every
          table concurrently. Each owns its own WS + buffer. */}
      {tables.map((t) => {
        const ext = t.external_game_id || t.id;
        return <TableMonitor key={ext} extId={ext} onSnapshot={handleSnapshot} />;
      })}

      {/* Header bar */}
      <header
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          borderBottom: "1px solid rgba(208,135,0,0.3)",
          background: "linear-gradient(to right, #000000 0%, #171717 50%, #000000 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <a
            href="/studio"
            className="text-[#99a1af] hover:text-white transition-colors"
            aria-label="Back to studio"
            title="Back to studio"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </a>
          <h1 className="font-bold text-lg" style={{ color: "#f0b100" }}>
            Player Chats
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className="inline-block rounded-full"
            style={{
              width: 8,
              height: 8,
              backgroundColor: activeSnap.connected ? "#05df72" : "#6a7282",
            }}
          />
          <span style={{ color: activeSnap.connected ? "#05df72" : "#6a7282" }}>
            {activeSnap.connected ? "Live" : "Connecting..."}
          </span>
          <span className="ml-3 text-[#99a1af]">
            Players:&nbsp;
            <span className="text-white font-semibold">{activeSnap.presence}</span>
          </span>
        </div>
      </header>

      {/* Mobile table switcher (dropdown) */}
      <div className="md:hidden px-4 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <select
          value={activeExtId}
          onChange={(e) => selectTable(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", border: "1px solid rgba(208,135,0,0.2)" }}
        >
          {loading && !tables.length && <option value="">Loading tables...</option>}
          {!loading && !tables.length && <option value="">No tables</option>}
          {tables.map((t) => {
            const ext = t.external_game_id || t.id;
            const n = unread[ext] || 0;
            return (
              <option key={ext} value={ext}>
                {t.name}
                {n > 0 ? `  (${n > 99 ? "99+" : n} new)` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {/* Body: desktop side list + message pane */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop side list */}
        <aside
          className="hidden md:flex flex-col w-56 shrink-0 overflow-y-auto"
          style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: panelBg }}
        >
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6a7282]">
            Tables
          </div>
          {loading && !tables.length && (
            <div className="px-3 py-2 text-xs text-[#6a7282]">Loading...</div>
          )}
          {!loading && !tables.length && (
            <div className="px-3 py-2 text-xs text-[#6a7282]">No tables</div>
          )}
          {tables.map((t) => {
            const ext = t.external_game_id || t.id;
            const isActive = ext === activeExtId;
            const n = unread[ext] || 0;
            const snap = monitors[ext];
            return (
              <button
                key={ext}
                onClick={() => selectTable(ext)}
                className="flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors"
                style={{
                  backgroundColor: isActive ? "rgba(208,135,0,0.15)" : "transparent",
                  borderLeft: `3px solid ${isActive ? "#f0b100" : "transparent"}`,
                }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block rounded-full shrink-0"
                    style={{
                      width: 7,
                      height: 7,
                      backgroundColor: snap?.connected ? "#05df72" : "#6a7282",
                    }}
                  />
                  <span
                    className="truncate text-sm"
                    style={{ color: isActive ? "#f0b100" : "#d1d5db" }}
                  >
                    {t.name}
                  </span>
                </span>
                {n > 0 && (
                  <span
                    className="shrink-0 rounded-full px-1.5 text-[10px] font-bold text-black"
                    style={{ backgroundColor: "#f0b100", minWidth: 18, textAlign: "center" }}
                  >
                    {n > 99 ? "99+" : n}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Message pane */}
        <main className="flex flex-col flex-1 min-w-0">
          <div
            className="px-4 py-2 shrink-0 text-xs text-[#6a7282] hidden md:block"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {activeTable ? (
              <>
                Viewing&nbsp;
                <span className="text-white font-medium">{activeTable.name}</span>
                <span className="ml-1 text-[#6a7282]">({activeExtId})</span>
              </>
            ) : (
              "Select a table"
            )}
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {!activeExtId ? (
              <div className="text-sm text-[#6a7282] py-8 text-center">
                Select a table to view its chat.
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="text-sm text-[#6a7282] py-8 text-center">
                {activeSnap.connected ? "No messages yet." : "Loading chat..."}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {activeMessages.map((m) => (
                  <li key={m.id} className="text-sm leading-snug">
                    <span className="text-[11px] tabular-nums text-[#6a7282] mr-2">
                      {fmtDateTime(m.time)}
                    </span>
                    <span className="font-semibold" style={{ color: "#f0b100" }}>
                      {m.user}
                    </span>
                    <span className="text-[#6a7282] mx-1">:</span>
                    <span className="text-[#e5e7eb] break-words">{m.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
