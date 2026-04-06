"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

interface TableDetail {
  id: string;
  external_game_id: string;
  name: string;
  table_type: string;
  is_active: boolean;
  min_bet: number;
  max_bet: number;
  dealer_name: string | null;
  dealer_id: string | null;
  stream_url: string | null;
  stream_key: string | null;
  default_betting_time: number | null;
  video_snapshot_url: string | null;
  player_count: number | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export default function TableDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [table, setTable] = useState<TableDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Editable fields */
  const [name, setName] = useState("");
  const [tableType, setTableType] = useState("standard");
  const [minBet, setMinBet] = useState("");
  const [maxBet, setMaxBet] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [bettingTime, setBettingTime] = useState("");

  /* Confirm dialogs */
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tables/${id}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setTable(data);
        setName(data.name || "");
        setTableType(data.table_type || "standard");
        setMinBet(String(data.min_bet ?? "10"));
        setMaxBet(String(data.max_bet ?? "10000"));
        setDealerName(data.dealer_name || "");
        setStreamUrl(data.stream_url || "");
        setStreamKey(data.stream_key || "");
        setBettingTime(String(data.default_betting_time ?? "15"));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          table_type: tableType || undefined,
          min_bet: minBet !== "" ? parseFloat(minBet) : undefined,
          max_bet: maxBet !== "" ? parseFloat(maxBet) : undefined,
          dealer_name: dealerName || null,
          stream_url: streamUrl || null,
          stream_key: streamKey || null,
          default_betting_time: bettingTime !== "" ? parseInt(bettingTime) : undefined,
        }),
      });
      if (res.ok) {
        fetchTable();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `Failed to save (${res.status})`);
      }
    } catch {
      setError("Network error — check your connection");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!table) return;
    const action = table.is_active ? "close" : "open";
    try {
      const res = await fetch(`/api/admin/tables/${id}/${action}`, {
        method: "POST",
      });
      if (res.ok) fetchTable();
    } catch {
      // silent
    }
  }

  async function handleDeactivate() {
    try {
      const res = await fetch(`/api/admin/tables/${id}`, {
        method: "DELETE",
      });
      if (res.ok) router.push("/admin/tables");
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>Loading table...</span>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>Table not found</span>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.2)" as const,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/tables")}
        className="flex items-center gap-1 text-sm hover:underline"
        style={{ color: "#99a1af" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Tables
      </button>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{table.name}</h1>
        <StatusBadge status={table.is_active ? "active" : "inactive"} />
      </div>

      {/* Info card */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span style={{ color: "#6a7282" }}>Game ID</span>
            <p className="text-white font-mono mt-0.5">
              {table.external_game_id || "\u2014"}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Type</span>
            <p className="text-white mt-0.5 capitalize">{table.table_type}</p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Players Online</span>
            <p className="text-white mt-0.5">{table.player_count ?? 0}</p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Created</span>
            <p className="text-white mt-0.5">
              {table.created_at
                ? new Date(table.created_at).toLocaleString()
                : "\u2014"}
            </p>
          </div>
        </div>

        {/* Open/Close toggle */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(208,135,0,0.1)" }}>
          <button
            onClick={handleToggle}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: table.is_active
                ? "rgba(251,44,54,0.1)"
                : "rgba(0,188,125,0.1)",
              color: table.is_active ? "#fb2c36" : "#00bc7d",
              border: table.is_active
                ? "1px solid rgba(251,44,54,0.3)"
                : "1px solid rgba(0,188,125,0.3)",
            }}
          >
            {table.is_active ? "Close Table" : "Open Table"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "#d08700" }}
        >
          Edit Table
        </h2>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Table Type
          </label>
          <select
            value={tableType}
            onChange={(e) => setTableType(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          >
            <option value="standard">Standard</option>
            <option value="vip">VIP</option>
            <option value="speed">Speed</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Min Bet
            </label>
            <input
              type="number"
              value={minBet}
              onChange={(e) => setMinBet(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Max Bet
            </label>
            <input
              type="number"
              value={maxBet}
              onChange={(e) => setMaxBet(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Dealer Name
          </label>
          <input
            type="text"
            placeholder="e.g. Dealer Maria"
            value={dealerName}
            onChange={(e) => setDealerName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>

        <div
          className="pt-4 space-y-4"
          style={{ borderTop: "1px solid rgba(208,135,0,0.1)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#99a1af" }}>
            Stream Configuration
          </h3>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Stream URL
            </label>
            <input
              type="url"
              placeholder="rtmp://stream.example.com/live"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Stream Key
            </label>
            <input
              type="text"
              placeholder="stream-key-abc123"
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none font-mono"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Default Betting Time (seconds)
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={bettingTime}
              onChange={(e) => setBettingTime(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "rgba(251,44,54,0.1)", color: "#fb2c36", border: "1px solid rgba(251,44,54,0.3)" }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-6 py-2 text-sm font-semibold text-black disabled:opacity-50"
            style={{ backgroundColor: "#f0b100" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(251,44,54,0.2)",
        }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "#fb2c36" }}
        >
          Danger Zone
        </h2>

        <button
          onClick={() => setShowDeactivate(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "rgba(251,44,54,0.1)",
            color: "#fb2c36",
            border: "1px solid rgba(251,44,54,0.3)",
          }}
        >
          Deactivate Table
        </button>
      </div>

      <ConfirmDialog
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Table"
        message="This will close the table and remove it from the lobby. All active players will be disconnected. You can reactivate later."
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
