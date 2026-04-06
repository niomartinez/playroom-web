"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { useDebounce } from "@/lib/use-debounce";

interface Round {
  id: string;
  external_fight_id: string;
  game_id: string;
  game_name: string;
  external_game_id: string;
  status: string;
  result: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface TableOption {
  id: string;
  name: string;
  external_game_id: string;
}

const STATUS_OPTIONS = [
  "betting_open",
  "betting_closed",
  "dealing",
  "result",
  "settling",
  "settled",
  "cancelled",
  "voided",
];

function statusToBadge(status: string): "active" | "inactive" | "pending" | "error" {
  switch (status) {
    case "settled":
      return "active";
    case "voided":
    case "cancelled":
      return "error";
    case "betting_open":
    case "dealing":
      return "pending";
    default:
      return "inactive";
  }
}

export default function RoundsPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  /* Filters */
  const [filterTable, setFilterTable] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedDateFrom = useDebounce(dateFrom, 300);
  const debouncedDateTo = useDebounce(dateTo, 300);

  // Fetch tables for filter dropdown
  useEffect(() => {
    fetch("/api/admin/tables")
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json) ? json : json.data ?? [];
        setTables(data);
      })
      .catch(() => {});
  }, []);

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (filterTable) params.set("game_id", filterTable);
      if (filterStatus) params.set("status", filterStatus);
      if (debouncedDateFrom) params.set("date_from", new Date(debouncedDateFrom).toISOString());
      if (debouncedDateTo) params.set("date_to", new Date(debouncedDateTo + "T23:59:59").toISOString());

      const res = await fetch(`/api/admin/rounds?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setRounds(data.rounds ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filterTable, filterStatus, debouncedDateFrom, debouncedDateTo]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  function handleFilter() {
    setPage(1);
    // useEffect on [page, ...] will trigger the fetch
  }

  function handleClear() {
    setFilterTable("");
    setFilterStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    // useEffect will trigger the fetch
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.15)" as const,
  };

  const columns: Column<Round>[] = [
    {
      key: "external_fight_id",
      label: "Round ID",
      render: (row) => (
        <span className="font-mono text-xs">{row.external_fight_id}</span>
      ),
    },
    {
      key: "game_name",
      label: "Table",
      render: (row) => (
        <span>{row.game_name || row.external_game_id || "\u2014"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge
          status={statusToBadge(row.status)}
          label={row.status.replace(/_/g, " ")}
        />
      ),
    },
    {
      key: "result",
      label: "Result",
      render: (row) => {
        if (!row.result) return <span style={{ color: "#6a7282" }}>{"\u2014"}</span>;
        const color =
          row.result === "Banker"
            ? "#fb2c36"
            : row.result === "Player"
              ? "#2b7fff"
              : "#00bc7d";
        return <span style={{ color, fontWeight: 600 }}>{row.result}</span>;
      },
    },
    {
      key: "started_at",
      label: "Started",
      sortable: true,
      render: (row) =>
        row.started_at
          ? new Date(row.started_at).toLocaleString()
          : "\u2014",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Rounds</h1>

      {/* Filters */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Table
            </label>
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            >
              <option value="">All Tables</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleFilter}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-black"
            style={{ backgroundColor: "#f0b100" }}
          >
            Filter
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg px-4 py-2 text-sm text-[#99a1af] hover:text-white transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      <DataTable
        columns={columns}
        data={rounds}
        loading={loading}
        emptyMessage="No rounds found"
        searchPlaceholder="Search rounds..."
        onRowClick={(row) => router.push(`/admin/rounds/${row.id}`)}
        pageSize={pageSize}
        disablePagination
      />

      {/* Server-side pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs" style={{ color: "#6a7282" }}>
          <span>
            Page {page} of {totalPages} ({total} rounds)
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
