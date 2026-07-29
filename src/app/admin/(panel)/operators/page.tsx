"use client";

import { useState } from "react";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import { useAdminQuery, invalidateAdminQuery } from "@/lib/admin-query";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import FormDialog from "@/components/admin/ui/FormDialog";
import { useToast } from "@/lib/toast-context";

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
  const { toast } = useToast();

  /* Create dialog state */
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWalletUrl, setNewWalletUrl] = useState("");
  const [newWalletMode, setNewWalletMode] = useState("seamless");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Cached: the operators list is read by several pages and barely changes, so
     it repaints instantly on revisit and refreshes underneath. `refetch` after a
     mutation replaces the old manual re-fetch. */
  const {
    data: operatorsData,
    loading,
    refreshing,
    refetch,
  } = useAdminQuery<Operator[]>("/api/admin/operators");
  const operators = operatorsData ?? [];

  /* Any write invalidates every cached view of this resource — a create or a
     status change can appear on a page or filter combination other than the one
     we are looking at. */
  const fetchOperators = () => {
    invalidateAdminQuery("/api/admin/operators");
    refetch();
  };

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
        toast({ type: "success", message: "System Provider created" });
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.message || `Failed to create operator (${res.status})`;
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

  /* Card mode below md: the name identifies the provider, and the four
     remaining columns all answer something an operator asks on a phone (which
     credentials, which wallet mode, live or not, since when). */
  const columns: Column<Operator>[] = [
    { key: "name", label: "Name", sortable: true, mobile: "title" },
    { key: "client_id", label: "Client ID", mobile: "row" },
    { key: "wallet_mode", label: "Wallet Mode", mobile: "row", mobileLabel: "Wallet" },
    {
      key: "is_active",
      label: "Active",
      mobile: "row",
      render: (row) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      mobile: "row",
      render: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleDateString()
          : "\u2014",
    },
  ];

  return (
    <div className="space-y-6">
      {/* "System Providers" and "Create System Provider" cannot share a 390px
          row, so below md they stack and the action spans the width. */}
      <div className="flex items-center justify-between max-md:flex-col max-md:items-stretch max-md:gap-3">
        <h1 className="text-2xl font-bold text-white">System Providers</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black max-md:w-full max-md:min-h-[44px]"
          style={{ backgroundColor: "#f0b100" }}
        >
          Create System Provider
        </button>
      </div>

      <RefreshingHint show={refreshing && !loading} />

      <DataTable
        columns={columns}
        data={operators}
        loading={loading}
        emptyMessage="No operators found"
        searchPlaceholder="Search operators..."
        onRowClick={(row) => router.push(`/admin/operators/${row.id}`)}
      />

      {/* Create System Provider Dialog */}
      <FormDialog
        open={showCreate}
        onClose={() => { setShowCreate(false); setError(null); }}
        title="Create System Provider"
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
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
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
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
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
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
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
