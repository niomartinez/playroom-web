"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import FormDialog from "@/components/admin/ui/FormDialog";

interface Table {
  id: string;
  external_game_id: string;
  name: string;
  table_type: string;
  is_active: boolean;
  min_bet: number;
  max_bet: number;
  dealer_name: string | null;
  [key: string]: unknown;
}

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  /* Create dialog state */
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGameId, setNewGameId] = useState("");
  const [newType, setNewType] = useState("standard");
  const [newMinBet, setNewMinBet] = useState("10");
  const [newMaxBet, setNewMaxBet] = useState("10000");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tables");
      if (res.ok) {
        const json = await res.json();
        setTables(
          Array.isArray(json) ? json : json.data ?? json.tables ?? []
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

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
          table_type: newType,
          min_bet: parseFloat(newMinBet) || 10,
          max_bet: parseFloat(newMaxBet) || 10000,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName("");
        setNewGameId("");
        setNewType("standard");
        setNewMinBet("10");
        setNewMaxBet("10000");
        fetchTables();
      }
    } catch {
      // silent
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
      if (res.ok) fetchTables();
    } catch {
      // silent
    } finally {
      setToggling(null);
    }
  }

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.2)" as const,
  };

  const columns: Column<Table>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "external_game_id", label: "Game ID" },
    { key: "table_type", label: "Type" },
    {
      key: "min_bet",
      label: "Bet Range",
      render: (row) => (
        <span className="font-mono text-xs">
          {row.min_bet?.toLocaleString()} – {row.max_bet?.toLocaleString()}
        </span>
      ),
    },
    {
      key: "dealer_name",
      label: "Dealer",
      render: (row) => (
        <span style={{ color: row.dealer_name ? "#ffffff" : "#6a7282" }}>
          {row.dealer_name || "\u2014"}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (row) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
    {
      key: "_actions",
      label: "",
      render: (row) => (
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
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tables</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black"
          style={{ backgroundColor: "#f0b100" }}
        >
          Create Table
        </button>
      </div>

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
            Table Name
          </label>
          <input
            type="text"
            placeholder="e.g. Baccarat A1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
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
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
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
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
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
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
