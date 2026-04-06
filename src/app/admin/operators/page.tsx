"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import FormDialog from "@/components/admin/ui/FormDialog";

interface Operator {
  id: string;
  name: string;
  client_id: string;
  wallet_mode: string;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

export default function OperatorsPage() {
  const router = useRouter();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  /* Create dialog state */
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWalletUrl, setNewWalletUrl] = useState("");
  const [newWalletMode, setNewWalletMode] = useState("seamless");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/operators");
      if (res.ok) {
        const data = await res.json();
        setOperators(
          Array.isArray(data) ? data : data.data ?? data.operators ?? []
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          wallet_url: newWalletUrl.trim() || undefined,
          wallet_mode: newWalletMode,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName("");
        setNewWalletUrl("");
        setNewWalletMode("seamless");
        fetchOperators();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `Failed to create operator (${res.status})`);
      }
    } catch {
      setError("Network error — check your connection");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Operator>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "client_id", label: "Client ID" },
    { key: "wallet_mode", label: "Wallet Mode" },
    {
      key: "is_active",
      label: "Active",
      render: (row) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleDateString()
          : "\u2014",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Operators</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black"
          style={{ backgroundColor: "#f0b100" }}
        >
          Create Operator
        </button>
      </div>

      <DataTable
        columns={columns}
        data={operators}
        loading={loading}
        emptyMessage="No operators found"
        searchPlaceholder="Search operators..."
        onRowClick={(row) => router.push(`/admin/operators/${row.id}`)}
      />

      {/* Create Operator Dialog */}
      <FormDialog
        open={showCreate}
        onClose={() => { setShowCreate(false); setError(null); }}
        title="Create Operator"
        onSave={handleCreate}
        saving={saving}
      >
        {error && (
          <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "rgba(251,44,54,0.1)", color: "#fb2c36", border: "1px solid rgba(251,44,54,0.3)" }}>
            {error}
          </div>
        )}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Operator Name
          </label>
          <input
            type="text"
            placeholder="e.g. Galaxy Club"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(208,135,0,0.2)",
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Wallet URL
          </label>
          <input
            type="url"
            placeholder="https://operator.com/wallet/api"
            value={newWalletUrl}
            onChange={(e) => setNewWalletUrl(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(208,135,0,0.2)",
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Wallet Mode
          </label>
          <select
            value={newWalletMode}
            onChange={(e) => setNewWalletMode(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(208,135,0,0.2)",
            }}
          >
            <option value="seamless">Seamless</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </FormDialog>
    </div>
  );
}
