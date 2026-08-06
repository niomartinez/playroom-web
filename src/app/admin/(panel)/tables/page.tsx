"use client";

import { useEffect, useRef, useState } from "react";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import { useAdminQuery, invalidateAdminQuery } from "@/lib/admin-query";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import FormDialog from "@/components/admin/ui/FormDialog";
import { useToast } from "@/lib/toast-context";
import { useAdmin } from "@/lib/admin-context";

interface Table {
  id: string;
  external_game_id: string;
  /** Internal/studio label. */
  name: string;
  /** Player-facing lobby name; null = lobby falls back to `name`. */
  lobby_name: string | null;
  table_type: string;
  is_active: boolean;
  min_bet: number;
  max_bet: number;
  dealer_name: string | null;
  /** Live presence, computed per request from stream_sessions (150s window) —
      NOT the dead games.player_count column, which is always 0. */
  player_count: number | null;
  [key: string]: unknown;
}

export default function TablesPage() {
  /* Read-only roles (viewer, game_provider) see the list and nothing to press.
     The backend refuses these writes regardless; this stops offering a button
     whose only outcome is a 403. */
  const { canWrite } = useAdmin();
  const mayEdit = canWrite("tables");
  const router = useRouter();
  const { toast } = useToast();

  /* Create dialog state */
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLobbyName, setNewLobbyName] = useState("");
  const [newGameId, setNewGameId] = useState("");
  const [newType, setNewType] = useState("standard");
  const [newMinBet, setNewMinBet] = useState("10");
  const [newMaxBet, setNewMaxBet] = useState("10000");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  /* Cached: shared with every other page that reads tables, so it repaints
     instantly on revisit and refreshes underneath instead of blanking. */
  const {
    data: tablesData,
    loading,
    refreshing,
    refetch,
  } = useAdminQuery<Table[]>("/api/admin/tables");
  const tables = tablesData ?? [];

  /* A write can change any cached view of this resource, not just the one on
     screen, so invalidate the whole prefix and refetch. */
  const fetchTables = () => {
    invalidateAdminQuery("/api/admin/tables");
    refetch();
  };

  /* The Players column is live presence with a 150s window, so a cached list
     left open would quietly become a count of who WAS here. Through a ref with
     an empty dep list: useAdminQuery returns a new `refetch` each render, and
     depending on it directly would restart the countdown every re-render. */
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  useEffect(() => {
    const t = setInterval(() => refetchRef.current(), 20_000);
    return () => clearInterval(t);
  }, []);

  async function handleCreate() {
    if (!newName.trim() || !newGameId.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          external_game_id: newGameId.trim(),
          name: newName.trim(),
          // Blank => the lobby falls back to the internal name server-side.
          lobby_name: newLobbyName.trim() || null,
          table_type: newType,
          min_bet: parseFloat(newMinBet) || 10,
          max_bet: parseFloat(newMaxBet) || 10000,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName("");
        setNewLobbyName("");
        setNewGameId("");
        setNewType("standard");
        setNewMinBet("10");
        setNewMaxBet("10000");
        fetchTables();
        toast({ type: "success", message: "Table created" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ type: "error", message: data.message || "Failed to create table" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(table: Table) {
    setToggling(table.id);
    try {
      const action = table.is_active ? "close" : "open";
      const res = await fetch(`/api/admin/tables/${table.id}/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        fetchTables();
        toast({ type: "success", message: `Table ${action === "open" ? "opened" : "closed"}` });
      } else {
        toast({ type: "error", message: `Failed to ${action} table` });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setToggling(null);
    }
  }

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.2)" as const,
  };

  /* Card mode below md. Eight columns is four too many for a 390px card, so:
     the studio name titles it; type is dropped (it is on the detail page and
     rarely the thing being checked); and the Open/Close action is dropped too,
     because the card itself is the button that opens the table's detail page
     and a button inside a button is neither valid nor tappable. Closing a table
     from a phone is done from that detail page. */
  const columns: Column<Table>[] = [
    { key: "name", label: "Name (studio)", sortable: true, mobile: "title" },
    {
      key: "lobby_name",
      label: "Lobby Name (players)",
      mobile: "row",
      mobileLabel: "Lobby",
      render: (r) => (
        <span style={{ color: r.lobby_name ? undefined : "#6a7282" }}>
          {(r.lobby_name as string) || "— same as name"}
        </span>
      ),
    },
    { key: "external_game_id", label: "Game ID", mobile: "row" },
    { key: "table_type", label: "Type", mobile: "hide" },
    {
      key: "min_bet",
      label: "Bet Range",
      mobile: "row",
      render: (row) => (
        <span className="font-mono text-xs">
          {row.min_bet?.toLocaleString()} – {row.max_bet?.toLocaleString()}
        </span>
      ),
    },
    {
      key: "dealer_name",
      label: "Dealer",
      mobile: "row",
      render: (row) => (
        <span style={{ color: row.dealer_name ? "#ffffff" : "#6a7282" }}>
          {row.dealer_name || "\u2014"}
        </span>
      ),
    },
    {
      /* Live presence, already in the payload \u2014 the list just never showed it,
         so "how busy is table 2 right now" meant opening each table in turn.
         Sortable client-side is honest here: this list is the whole set, not
         one page of it. Click through for the names behind the number. */
      key: "player_count",
      label: "Players",
      sortable: true,
      mobile: "row",
      mobileLabel: "Players now",
      render: (row) => {
        const n = Number(row.player_count ?? 0);
        return n > 0 ? (
          <span className="inline-flex items-center gap-1.5" style={{ color: "#05df72" }}>
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, backgroundColor: "#05df72" }}
            />
            {n}
          </span>
        ) : (
          <span style={{ color: "#6a7282" }}>0</span>
        );
      },
    },
    {
      key: "is_active",
      label: "Status",
      mobile: "row",
      render: (row) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
    ...(mayEdit ? [{
      key: "_actions",
      label: "",
      mobile: "hide" as const,
      render: (row: Table) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(row);
          }}
          disabled={toggling === row.id}
          className="rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: row.is_active
              ? "rgba(251,44,54,0.1)"
              : "rgba(0,188,125,0.1)",
            color: row.is_active ? "#fb2c36" : "#00bc7d",
            border: row.is_active
              ? "1px solid rgba(251,44,54,0.3)"
              : "1px solid rgba(0,188,125,0.3)",
          }}
        >
          {toggling === row.id
            ? "..."
            : row.is_active
              ? "Close"
              : "Open"}
        </button>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between max-md:flex-col max-md:items-stretch max-md:gap-3">
        <h1 className="text-2xl font-bold text-white">Tables</h1>
        {mayEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-black max-md:w-full max-md:min-h-[44px]"
            style={{ backgroundColor: "#f0b100" }}
          >
            Create Table
          </button>
        )}
      </div>

      <RefreshingHint show={refreshing && !loading} />

      <DataTable
        columns={columns}
        data={tables}
        loading={loading}
        emptyMessage="No tables found"
        searchPlaceholder="Search tables..."
        onRowClick={(row) => router.push(`/admin/tables/${row.id}`)}
      />

      {/* Create Table Dialog */}
      <FormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Table"
        onSave={handleCreate}
        saving={saving}
      >
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Table Name (internal)
          </label>
          <input
            type="text"
            placeholder="e.g. Baccarat Table 1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
            What dealers pick from in the studio. Keep it plain and stable.
          </p>
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Lobby Name (player-facing)
          </label>
          <input
            type="text"
            placeholder="e.g. XXX Baccarat Table 1"
            value={newLobbyName}
            onChange={(e) => setNewLobbyName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
            What players see in the operator&rsquo;s lobby (GameSpot &rarr; Games
            &rarr; PRG &rarr; …). Rebrand this freely — it does not touch the
            studio. Leave blank to reuse the internal name.
          </p>
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            External Game ID
          </label>
          <input
            type="text"
            placeholder="e.g. BAC-A1"
            value={newGameId}
            onChange={(e) => setNewGameId(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Table Type
          </label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
            style={inputStyle}
          >
            <option value="standard">Standard</option>
            <option value="vip">VIP</option>
            <option value="speed">Speed</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Min Bet
            </label>
            <input
              type="number"
              value={newMinBet}
              onChange={(e) => setNewMinBet(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Max Bet
            </label>
            <input
              type="number"
              value={newMaxBet}
              onChange={(e) => setNewMaxBet(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
