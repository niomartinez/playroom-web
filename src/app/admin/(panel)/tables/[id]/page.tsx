"use client";

import { useState, useEffect, useRef } from "react";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import { useAdminQuery, invalidateAdminQuery } from "@/lib/admin-query";
import { useAdmin } from "@/lib/admin-context";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/lib/toast-context";

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

interface TablePlayer {
  id: string;
  external_user_id: string;
  username: string;
  display_name: string | null;
  display_name_set: boolean;
  balance: number;
  currency_code: string;
  is_active: boolean;
  is_test: boolean;
  operator_name: string;
  last_seen_at: string | null;
  session_started_at: string | null;
  idle_rounds: number;
  stream_revoked: boolean;
}

export default function TableDetailPage() {
  /* Read-only roles reach this page (they may read `tables`) but every control
     on it is a write the backend would refuse. Show the record, not the levers. */
  const { canWrite } = useAdmin();
  const mayEdit = canWrite("tables");
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [saving, setSaving] = useState(false);

  /* Editable fields */
  const [name, setName] = useState("");
  const [tableType, setTableType] = useState("standard");
  /* min_bet / max_bet are deliberately NOT edited here — /admin/settings owns
     them (see the read-only Bet Range panel below). */
  const [dealerName, setDealerName] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [bettingTime, setBettingTime] = useState("");

  /* Confirm dialogs */
  const [showDeactivate, setShowDeactivate] = useState(false);
  /* Closing is the same write as deactivating — is_active = false, table out of
     the lobby, everyone watching disconnected — and it used to fire on a single
     click while Deactivate, doing the identical thing, asked first. */
  const [showClose, setShowClose] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: tableData,
    loading,
    refreshing,
    refetch,
  } = useAdminQuery<TableDetail>(`/api/admin/tables/${id}`);
  const table = tableData ?? null;

  /* Who is behind "Players Online". The number alone could not be checked or
     acted on — same presence window, listed instead of tallied. */
  const {
    data: playersData,
    loading: playersLoading,
    refetch: refetchPlayers,
  } = useAdminQuery<{
    players: TablePlayer[];
    total: number;
  }>(`/api/admin/tables/${id}/players`);
  const tablePlayers = playersData?.players ?? [];

  /* Presence expires after 150s, so a card left open would quietly become a
     list of who WAS here. Refreshed well inside that window — and the table
     record with it, since its Players Online reads the same presence.

     Through a ref with an empty dep list: useAdminQuery hands back a fresh
     `refetch` closure on every render, so depending on it directly would tear
     the interval down and restart the 20s countdown each time the page
     re-rendered — a timer that resets often enough never fires. */
  const pollRef = useRef({ refetchPlayers, refetch });
  pollRef.current = { refetchPlayers, refetch };
  useEffect(() => {
    const t = setInterval(() => {
      pollRef.current.refetchPlayers();
      pollRef.current.refetch();
    }, 20_000);
    return () => clearInterval(t);
  }, []);

  /* Seed the form ONCE per record, not on every data change.
   *
   * This page is cached and revalidates in the background, so re-seeding on
   * each render would overwrite whatever the admin is currently typing the
   * moment a refresh landed. The ref tracks which record has been seeded, so a
   * background refresh updates the displayed table facts while leaving the
   * edit fields exactly as the person left them. Navigating to a DIFFERENT
   * table re-seeds, because the id changes. */
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!tableData || seededFor.current === id) return;
    seededFor.current = id;
    setName(tableData.name || "");
    setTableType(tableData.table_type || "standard");
    setDealerName(tableData.dealer_name || "");
    setStreamUrl(tableData.stream_url || "");
    setStreamKey(tableData.stream_key || "");
    setBettingTime(String(tableData.default_betting_time ?? "15"));
  }, [tableData, id]);

  /* A save/toggle changes this table on the list too. */
  const fetchTable = () => {
    invalidateAdminQuery("/api/admin/tables");
    refetch();
  };

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
          dealer_name: dealerName || null,
          stream_url: streamUrl || null,
          stream_key: streamKey || null,
          default_betting_time: bettingTime !== "" ? parseInt(bettingTime) : undefined,
        }),
      });
      if (res.ok) {
        fetchTable();
        toast({ type: "success", message: "Table saved" });
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.message || `Failed to save (${res.status})`;
        setError(msg);
        toast({ type: "error", message: msg });
      }
    } catch {
      setError("Network error — check your connection");
      toast({ type: "error", message: "Network error — check your connection" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!table) return;
    const action = table.is_active ? "close" : "open";
    setShowClose(false);
    try {
      const res = await fetch(`/api/admin/tables/${id}/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        fetchTable();
        toast({ type: "success", message: `Table ${action === "open" ? "opened" : "closed"}` });
      } else {
        toast({ type: "error", message: `Failed to ${action} table` });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    }
  }

  async function handleDeactivate() {
    try {
      const res = await fetch(`/api/admin/tables/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({ type: "success", message: "Table deactivated" });
        router.push("/admin/tables");
      } else {
        toast({ type: "error", message: "Failed to deactivate table" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
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
        className="flex items-center gap-1 text-sm hover:underline max-md:min-h-[44px]"
        style={{ color: "#99a1af" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Tables
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{table.name}</h1>
        <RefreshingHint show={refreshing && !loading} />
        <StatusBadge status={table.is_active ? "active" : "inactive"} />
      </div>

      {/* Info card */}
      <div
        className="rounded-xl p-6 max-md:p-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        {/* Two across is fine for the short facts, but Created is a full
            timestamp, so the pairs stack on a phone. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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

        {/* Open/Close toggle — write-only control. */}
        {mayEdit && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(208,135,0,0.1)" }}>
          {/* Opening is harmless and stays one click. Closing asks — it pulls a
              live table out of the lobby and cuts whoever is watching. */}
          <button
            onClick={() => (table.is_active ? setShowClose(true) : handleToggle())}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors max-md:w-full max-md:min-h-[44px]"
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
        )}
      </div>

      {/* Who is at the table. Read-only, so it renders for viewer roles too —
          the same `tables` permission that opened this page. */}
      <div
        className="rounded-xl p-6 max-md:p-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "#d08700" }}
          >
            Players at this table
          </h2>
          <span className="text-xs" style={{ color: "#6a7282" }}>
            live · last 150s
          </span>
        </div>

        {playersLoading ? (
          <p className="text-sm" style={{ color: "#6a7282" }}>Loading…</p>
        ) : tablePlayers.length === 0 ? (
          <p className="text-sm" style={{ color: "#6a7282" }}>
            Nobody is at this table right now.
          </p>
        ) : (
          <div className="space-y-2">
            {tablePlayers.map((p) => (
              <Link
                key={p.id}
                href={`/admin/players/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 max-md:flex-col max-md:items-start"
                style={{
                  backgroundColor: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(208,135,0,0.12)",
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white truncate">
                      {p.display_name_set && p.display_name
                        ? p.display_name
                        : p.username}
                    </span>
                    {p.is_test && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
                        style={{
                          backgroundColor: "rgba(208,135,0,0.15)",
                          color: "#f0b100",
                          border: "1px solid rgba(240,177,0,0.35)",
                        }}
                      >
                        TEST
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono truncate" style={{ color: "#6a7282" }}>
                    {p.external_user_id}
                    {p.operator_name ? ` · ${p.operator_name}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 max-md:w-full max-md:justify-between">
                  {/* Idle state is the reason to open this list: a seat that is
                      watching but never betting looks identical to a player
                      until you can see the counter. */}
                  <span
                    className="text-xs"
                    style={{
                      color: p.stream_revoked
                        ? "#fb2c36"
                        : p.idle_rounds > 0
                          ? "#f0b100"
                          : "#05df72",
                    }}
                  >
                    {p.stream_revoked
                      ? "Feed cut"
                      : p.idle_rounds > 0
                        ? `Idle ${p.idle_rounds}`
                        : "Betting"}
                  </span>
                  <span className="font-mono text-sm text-white">
                    {Number(p.balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    <span style={{ color: "#6a7282" }}>{p.currency_code}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Edit form — the whole card, since every field in it is an edit. */}
      {mayEdit && (
      <div
        className="rounded-xl p-6 space-y-4 max-md:p-4"
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
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
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
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
            style={inputStyle}
          >
            <option value="standard">Standard</option>
            <option value="vip">VIP</option>
            <option value="speed">Speed</option>
          </select>
        </div>

        {/* Bet range is read-only here on purpose. It is edited on
            /admin/settings, where every table's range sits side by side —
            these numbers only mean something relative to each other, and two
            screens that both write the same field is how a table ends up with
            a limit nobody remembers setting. */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Bet Range
          </label>
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2 max-md:flex-col max-md:items-start max-md:gap-1"
            style={{ backgroundColor: "rgba(0,0,0,0.35)", border: "1px solid rgba(208,135,0,0.12)" }}
          >
            <span className="font-mono text-sm text-white">
              {table?.min_bet?.toLocaleString() ?? "—"} –{" "}
              {table?.max_bet?.toLocaleString() ?? "—"}
            </span>
            <Link
              href="/admin/settings"
              className="text-xs font-medium max-md:inline-flex max-md:min-h-[44px] max-md:items-center"
              style={{ color: "#f0b100" }}
            >
              Edit in Settings →
            </Link>
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
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
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
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
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
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none font-mono max-md:min-h-[44px]"
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
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "rgba(251,44,54,0.1)", color: "#fb2c36", border: "1px solid rgba(251,44,54,0.3)" }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2 max-md:flex-col">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-6 py-2 text-sm font-semibold text-black disabled:opacity-50 max-md:w-full max-md:min-h-[44px]"
            style={{ backgroundColor: "#f0b100" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
      )}

      {/* Danger zone */}
      {mayEdit && (
      <div
        className="rounded-xl p-6 space-y-4 max-md:p-4"
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
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors max-md:w-full max-md:min-h-[44px]"
          style={{
            backgroundColor: "rgba(251,44,54,0.1)",
            color: "#fb2c36",
            border: "1px solid rgba(251,44,54,0.3)",
          }}
        >
          Deactivate Table
        </button>
      </div>
      )}

      <ConfirmDialog
        open={showClose}
        onClose={() => setShowClose(false)}
        onConfirm={handleToggle}
        title="Close Table"
        /* Names the cost in the moment, using the live count — "3 players are
           at this table" is a decision; "are you sure?" is a speed bump. */
        message={
          `${table.name} will be removed from the lobby and everyone watching will be disconnected.` +
          (table.player_count
            ? ` ${table.player_count} player${table.player_count === 1 ? " is" : "s are"} at this table right now.`
            : " Nobody is at the table right now.") +
          " Betting stops until you open it again. Reopening is one click."
        }
        confirmLabel="Close Table"
        danger
      />

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
