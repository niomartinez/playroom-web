"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/lib/toast-context";
import { isProdEnv } from "@/lib/server-env";

const inputStyle = {
  backgroundColor: "#0a0a0a",
  border: "1px solid #262626",
} as const;

interface GeneratedToken {
  display_name: string;
  token: string;
  game: string;
  url: string;
}

interface HistoryRow {
  display_name: string;
  balance: string;
  created_at: string;
  expires_at: string;
  status: "active" | "expired" | "revoked";
  last_seen_ip: string | null;
  stream_revoked: boolean | null;
  idle_rounds: number | null;
  last_seen_at: string | null;
  table: string | null;
  token: string | null;
  token_preview: string | null;
}

interface AuditRow {
  created_at: string;
  entity_id: string;
  new_value: { count?: number; balance?: string; by?: string; testers?: string[] };
  admin_users?: { email?: string; display_name?: string };
}

const STATUS_COLOR: Record<string, string> = {
  active: "#6ee7b7",
  expired: "#9ca3af",
  revoked: "#f87171",
};

function fmt(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function TestTokensPage() {
  const { toast } = useToast();
  const [tables, setTables] = useState<string[]>([]);
  const [table, setTable] = useState("");
  const [count, setCount] = useState(1);
  const [balance, setBalance] = useState("10000");
  const [ttl, setTtl] = useState(8);
  const [busy, setBusy] = useState(false);
  const [tokens, setTokens] = useState<GeneratedToken[]>([]);
  const [meta, setMeta] = useState<{ operator?: string; operator_scoped?: boolean } | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/test-token");
      const d = await res.json();
      setHistory(d?.data?.tokens || []);
      setAudit(d?.data?.audit || []);
    } catch {
      /* non-fatal */
    }
  }, []);

  // Staging-only surface. On prod the proxy + backend already refuse; this is
  // the friendly message so nobody wonders why it's dead.
  const prod = isProdEnv();

  useEffect(() => {
    if (prod) return;
    fetch("/api/admin/tables")
      .then((r) => r.json())
      .then((d) => {
        const raw = Array.isArray(d?.data) ? d.data : d?.data?.tables || [];
        const ids = raw
          .map((t: { external_game_id?: string }) => t?.external_game_id)
          .filter(Boolean);
        setTables(ids);
        // Default to a TEST table if present, else the first.
        setTable(ids.find((x: string) => x.startsWith("TEST")) || ids[0] || "");
      })
      .catch(() => undefined);
    loadHistory();
  }, [prod, loadHistory]);

  async function generate() {
    if (!table) {
      toast({ type: "error", message: "Pick a table" });
      return;
    }
    setBusy(true);
    setTokens([]);
    try {
      const res = await fetch("/api/admin/test-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, count, balance, ttl_hours: ttl }),
      });
      const data = await res.json();
      const list = data?.data?.tokens;
      if (res.ok && Array.isArray(list)) {
        const origin = window.location.origin;
        setTokens(
          list.map((t: GeneratedToken) => ({
            ...t,
            url: `${origin}/play?token=${t.token}&game=${t.game}&lang=en`,
          })),
        );
        setMeta({ operator: data.data.operator, operator_scoped: data.data.operator_scoped });
        loadHistory();
      } else {
        toast({ type: "error", message: data?.message || data?.error || "Failed to generate" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ type: "success", message: "Link copied" });
    } catch {
      toast({ type: "error", message: "Copy failed — select and copy manually" });
    }
  }

  if (prod) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white">Test tokens</h1>
        <p className="text-sm mt-2" style={{ color: "#99a1af" }}>
          Test-token generation is <strong>staging-only</strong>. Open this page on the
          staging admin panel to generate test links.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Test tokens</h1>
        <p className="text-sm mt-1" style={{ color: "#99a1af" }}>
          Generate a funded staging session with test money and copy the{" "}
          <code>/play</code> link to hand a tester. Staging-only — never touches
          real OCMS wallets.
        </p>
      </div>

      <div className="space-y-4 rounded-lg p-5" style={{ backgroundColor: "#111", border: "1px solid #1f1f1f" }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: "#99a1af" }}>Table</label>
          <select
            className="w-full rounded px-3 py-2 text-white text-sm"
            style={inputStyle}
            value={table}
            onChange={(e) => setTable(e.target.value)}
          >
            {tables.length === 0 && <option value="">Loading tables…</option>}
            {tables.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "#99a1af" }}>How many</label>
            <input
              type="number" min={1} max={10} value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="w-full rounded px-3 py-2 text-white text-sm" style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "#99a1af" }}>Test balance (₱)</label>
            <input
              value={balance} onChange={(e) => setBalance(e.target.value.replace(/[^0-9]/g, "") || "0")}
              className="w-full rounded px-3 py-2 text-white text-sm" style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "#99a1af" }}>Expires (h)</label>
            <input
              type="number" min={1} max={72} value={ttl}
              onChange={(e) => setTtl(Math.max(1, Math.min(72, Number(e.target.value) || 8)))}
              className="w-full rounded px-3 py-2 text-white text-sm" style={inputStyle}
            />
          </div>
        </div>

        <button
          onClick={generate} disabled={busy || !table}
          className="rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#2563eb" }}
        >
          {busy ? "Generating…" : "Generate link"}
        </button>
      </div>

      {tokens.length > 0 && (
        <div className="space-y-3">
          {meta && (
            <p className="text-xs" style={{ color: "#99a1af" }}>
              Operator: {meta.operator}
              {meta.operator_scoped ? "" : " (operator-less table — broadcasts unscoped)"}
            </p>
          )}
          {tokens.map((t) => (
            <div key={t.token} className="rounded-lg p-3" style={{ backgroundColor: "#0d0d0d", border: "1px solid #1f1f1f" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono" style={{ color: "#6ee7b7" }}>{t.display_name}</span>
                <button onClick={() => copy(t.url)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "#1f2937", color: "#e5e7eb" }}>
                  Copy
                </button>
              </div>
              <div className="text-xs font-mono break-all" style={{ color: "#9ca3af" }}>{t.url}</div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* History + statuses of previously generated tokens */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white mt-4">Generated tokens</h2>
          <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid #1f1f1f" }}>
            <table className="w-full text-xs" style={{ color: "#d1d5db" }}>
              <thead style={{ color: "#6b7280" }}>
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Tester</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Token</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Table</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Status</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Stream</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Balance</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Created</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Expires</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Last seen</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #1a1a1a" }}>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{h.display_name}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: "#9ca3af" }}>{h.token_preview || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{h.table || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span style={{ color: STATUS_COLOR[h.status] || "#9ca3af" }}>● {h.status}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {h.stream_revoked ? (
                        <span style={{ color: "#f87171" }}>cut (idle)</span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>{h.idle_rounds ? `idle ${h.idle_rounds}` : "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">₱{Number(h.balance || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(h.created_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(h.expires_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(h.last_seen_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {h.token ? (
                        <button
                          onClick={() => {
                            // Token isn't bound to a table — the game param just
                            // picks which table to open. Use the recorded table
                            // if we have it, else the table selected above.
                            const g = h.table || table;
                            copy(`${window.location.origin}/play?token=${h.token}&game=${g}&lang=en`);
                          }}
                          className="text-xs px-2 py-1 rounded whitespace-nowrap"
                          style={{ backgroundColor: "#1f2937", color: "#e5e7eb" }}
                          title={`Opens on ${h.table || table || "(pick a table above)"}`}
                        >
                          Copy link
                        </button>
                      ) : (
                        <span style={{ color: "#4b5563" }} title="expired/revoked — not re-usable">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit log — who generated what, when */}
      {audit.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white mt-4">Audit log</h2>
          <div className="space-y-1">
            {audit.map((a, i) => (
              <div key={i} className="text-xs px-3 py-2 rounded" style={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", color: "#9ca3af" }}>
                <span style={{ color: "#d1d5db" }}>{fmt(a.created_at)}</span>
                {" — "}
                <span style={{ color: "#93c5fd" }}>{a.new_value?.by || a.admin_users?.email || "admin"}</span>
                {" generated "}
                <strong style={{ color: "#e5e7eb" }}>{a.new_value?.count ?? "?"}</strong>
                {" token(s) on "}
                <span style={{ color: "#e5e7eb" }}>{a.entity_id}</span>
                {a.new_value?.balance ? ` · ₱${Number(a.new_value.balance).toLocaleString()} each` : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
