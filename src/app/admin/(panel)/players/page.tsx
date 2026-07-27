"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { useDebounce } from "@/lib/use-debounce";
import { useAdminQuery } from "@/lib/admin-query";
import Pagination from "@/components/admin/ui/Pagination";
import SortHeader, { type SortDir } from "@/components/admin/ui/SortHeader";
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

  /* Filters live in the URL, so Back restores the exact view and re-selecting a
     previous filter rebuilds a request URL that is already in the query cache —
     which is what makes it repaint with no request and no spinner. */
  const { values, setValues, setFilter } = useUrlFilters({
    page: "1",
    page_size: "20",
    operator_id: "",
    search: "",
    is_active: "",
    balance_min: "",
    balance_max: "",
    sort_by: "created_at",
    sort_dir: "desc",
  });
  const page = Math.max(1, Number(values.page) || 1);
  const pageSize = Number(values.page_size) || 20;
  const sortDir: SortDir = values.sort_dir === "asc" ? "asc" : "desc";

  // The search box is typed into, so it needs local state; the URL is updated
  // only once typing settles, or every keystroke would be a router.replace.
  const [searchInput, setSearchInput] = useState(values.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  useEffect(() => {
    if (debouncedSearch !== values.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, values.search, setFilter]);

  /* The balance bounds are typed into too, so they debounce for the same reason
     the search does — otherwise "100000" would fire six requests and create six
     cache entries on the way to the one that was meant. */
  const [balanceMin, setBalanceMin] = useState(values.balance_min);
  const [balanceMax, setBalanceMax] = useState(values.balance_max);
  const debouncedMin = useDebounce(balanceMin, 400);
  const debouncedMax = useDebounce(balanceMax, 400);
  useEffect(() => {
    if (debouncedMin !== values.balance_min) setFilter({ balance_min: debouncedMin });
  }, [debouncedMin, values.balance_min, setFilter]);
  useEffect(() => {
    if (debouncedMax !== values.balance_max) setFilter({ balance_max: debouncedMax });
  }, [debouncedMax, values.balance_max, setFilter]);

  const hasFilters =
    !!values.operator_id ||
    !!values.search ||
    !!values.is_active ||
    values.balance_min !== "" ||
    values.balance_max !== "";

  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: values.sort_by,
    sort_dir: sortDir,
  });
  if (values.operator_id) query.set("operator_id", values.operator_id);
  if (values.search) query.set("search", values.search);
  if (values.is_active) query.set("is_active", values.is_active);
  // Blank means "no bound" — an empty string would be parsed as 0 and silently
  // filter out every player with no balance.
  if (values.balance_min !== "") query.set("balance_min", values.balance_min);
  if (values.balance_max !== "") query.set("balance_max", values.balance_max);

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

  const sortProps = (key: string, defaultDir: SortDir = "desc") => ({
    sortKey: key,
    activeKey: values.sort_by,
    activeDir: sortDir,
    defaultDir,
    onSort: setFilter,
  });

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.15)" as const,
  };

  /* Headers sort on the SERVER (see SortHeader). DataTable's own `sortable`
     would reorder only the twenty rows on screen, which answers a different
     question than the header implies. */
  const columns: Column<Player>[] = [
    {
      key: "username",
      label: "Username",
      header: <SortHeader label="Username" {...sortProps("username", "asc")} />,
    },
    {
      key: "external_user_id",
      label: "External ID",
      header: (
        <SortHeader label="External ID" {...sortProps("external_user_id", "asc")} />
      ),
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
      header: <SortHeader label="Balance" {...sortProps("balance")} />,
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
      header: <SortHeader label="Status" {...sortProps("is_active")} />,
      render: (row) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      header: <SortHeader label="Joined" {...sortProps("created_at")} />,
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

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Status
            </label>
            <select
              value={values.is_active}
              onChange={(e) => setFilter({ is_active: e.target.value })}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            >
              <option value="">Any</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Balance range. Two bounds rather than a preset list because the
              useful question changes constantly — "who is over 100k", "who is
              sitting at zero" — and a dropdown of guesses would never have the
              one being asked today. Either bound may be left blank. */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Balance
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Min"
                value={balanceMin}
                onChange={(e) => setBalanceMin(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm text-white outline-none w-[100px]"
                style={inputStyle}
              />
              <span style={{ color: "#6a7282" }}>–</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Max"
                value={balanceMax}
                onChange={(e) => setBalanceMax(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm text-white outline-none w-[100px]"
                style={inputStyle}
              />
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput("");
                setBalanceMin("");
                setBalanceMax("");
                setValues({
                  page: "1",
                  operator_id: "",
                  search: "",
                  is_active: "",
                  balance_min: "",
                  balance_max: "",
                });
              }}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: "#262626", color: "#d1d5db" }}
            >
              Clear filters
            </button>
          )}
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

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        label="players"
        pageSize={pageSize}
        onPage={(p) => setValues({ page: String(p) })}
        onPageSize={(n) => setFilter({ page_size: String(n) })}
      />

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
