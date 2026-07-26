"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { useDebounce } from "@/lib/use-debounce";
import { useAdminQuery } from "@/lib/admin-query";
import { useUrlFilters } from "@/lib/use-url-filters";

interface Player {
  id: string;
  external_user_id: string;
  username: string;
  balance: number;
  currency_code: string;
  is_active: boolean;
  operator_id: string;
  operator_name: string;
  created_at: string;
  [key: string]: unknown;
}

interface OperatorOption {
  id: string;
  name: string;
}

function PlayersPageInner() {
  const router = useRouter();
  const pageSize = 20;

  /* Filters live in the URL, so Back restores the exact view and re-selecting a
     previous filter rebuilds a request URL that is already in the query cache —
     which is what makes it repaint with no request and no spinner. */
  const { values, setValues, setFilter } = useUrlFilters({
    page: "1",
    operator_id: "",
    search: "",
  });
  const page = Math.max(1, Number(values.page) || 1);

  // The search box is typed into, so it needs local state; the URL is updated
  // only once typing settles, or every keystroke would be a router.replace.
  const [searchInput, setSearchInput] = useState(values.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  useEffect(() => {
    if (debouncedSearch !== values.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, values.search, setFilter]);

  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (values.operator_id) query.set("operator_id", values.operator_id);
  if (values.search) query.set("search", values.search);

  const {
    data: playersData,
    loading,
    refreshing,
  } = useAdminQuery<{ players: Player[]; total: number }>(
    `/api/admin/players?${query.toString()}`,
  );
  const players = playersData?.players ?? [];
  const total = playersData?.total ?? 0;

  // The operator list barely changes and is shared with other pages, so it is
  // cached under its own key and costs nothing after the first visit anywhere.
  const { data: operatorsData } = useAdminQuery<OperatorOption[]>(
    "/api/admin/operators",
  );
  const operators = operatorsData ?? [];

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
      key: "operator_name",
      label: "System Provider",
      render: (row) => (
        <span>{row.operator_name || "\u2014"}</span>
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
          : "\u2014",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Players</h1>

      {/* Filter bar */}
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
              Operator
            </label>
            <select
              value={values.operator_id}
              onChange={(e) => setFilter({ operator_id: e.target.value })}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            >
              <option value="">All System Providers</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>
          </div>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none min-w-[220px]"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {refreshing && !loading && (
        <div
          className="text-xs flex items-center gap-2"
          style={{ color: "#6a7282" }}
          role="status"
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              border: "2px solid rgba(240,177,0,0.35)",
              borderTopColor: "#f0b100",
              display: "inline-block",
              animation: "prg-spin 0.7s linear infinite",
            }}
          />
          Refreshing…
        </div>
      )}
      <style>{"@keyframes prg-spin{to{transform:rotate(360deg)}}"}</style>

      <DataTable
        columns={columns}
        data={players}
        loading={loading}
        emptyMessage="No players found"
        searchPlaceholder="Search in results..."
        onRowClick={(row) => router.push(`/admin/players/${row.id}`)}
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
              onClick={() => setValues({ page: String(page - 1) })}
              className="rounded px-3 py-1 disabled:opacity-30 transition-colors hover:bg-white/5"
              style={{ color: "#99a1af" }}
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setValues({ page: String(page + 1) })}
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


/**
 * useSearchParams() forces a client-side bail-out during prerender, and Next
 * fails the BUILD unless the component reading it sits under a Suspense
 * boundary. Filters live in the URL now (see useUrlFilters), so every page that
 * adopts that pattern needs this wrapper.
 *
 * The fallback is the same skeleton state the table shows while loading, so the
 * boundary is invisible in practice — it exists to satisfy prerendering, not to
 * introduce a second loading look.
 */
export default function PlayersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <div
            className="rounded-xl"
            style={{ height: 360, backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
          />
        </div>
      }
    >
      <PlayersPageInner />
    </Suspense>
  );
}
