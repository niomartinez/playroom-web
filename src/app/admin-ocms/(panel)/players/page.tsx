"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { useDebounce } from "@/lib/use-debounce";

interface Player {
  id: string;
  external_user_id: string;
  username: string;
  balance: number;
  currency_code: string;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

export default function OcmsPlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin-ocms/players?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setPlayers(data.players ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  function handleSearch(q: string) {
    setSearch(q);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.15)" as const,
  };

  const columns: Column<Player>[] = [
    { key: "username", label: "Username", sortable: true },
    {
      key: "external_user_id",
      label: "External ID",
      render: (row) => (
        <span className="font-mono text-xs">{row.external_user_id}</span>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      render: (row) => (
        <span className="font-mono">
          {Number(row.balance).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}{" "}
          <span style={{ color: "#6a7282" }}>{row.currency_code}</span>
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
      key: "created_at",
      label: "Joined",
      sortable: true,
      render: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleDateString()
          : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Players</h1>

      {/* Filter bar (search only — single operator, read-only) */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Search
            </label>
            <input
              type="text"
              placeholder="Username or external ID..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none min-w-[220px]"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={players}
        loading={loading}
        emptyMessage="No players found"
        searchPlaceholder="Search in results..."
        onRowClick={(row) => router.push(`/admin-ocms/players/${row.id}`)}
        pageSize={pageSize}
        disablePagination
      />

      {/* Server-side pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "#6a7282" }}
        >
          <span>
            Page {page} of {totalPages} ({total} players)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded px-3 py-1 disabled:opacity-30 transition-colors hover:bg-white/5"
              style={{ color: "#99a1af" }}
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded px-3 py-1 disabled:opacity-30 transition-colors hover:bg-white/5"
              style={{ color: "#99a1af" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
