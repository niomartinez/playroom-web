"use client";

import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import UrlFilterBoundary from "@/components/admin/ui/UrlFilterBoundary";
import { useAdminQuery } from "@/lib/admin-query";
import Pagination from "@/components/admin/ui/Pagination";
import SortHeader, { type SortDir } from "@/components/admin/ui/SortHeader";
import { useUrlFilters } from "@/lib/use-url-filters";

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

function RoundsPageInner() {
  const router = useRouter();
  /* Filters in the URL: Back restores the exact view, and a filter used a
     minute ago rebuilds a request URL that is already the cache key — so it
     repaints with no request and no spinner. */
  const { values, setValues, setFilter } = useUrlFilters({
    page: "1",
    page_size: "20",
    game_id: "",
    status: "",
    date_from: "",
    date_to: "",
    sort_by: "created_at",
    sort_dir: "desc",
  });
  const page = Math.max(1, Number(values.page) || 1);
  const pageSize = Number(values.page_size) || 20;
  const sortDir: SortDir = values.sort_dir === "asc" ? "asc" : "desc";

  const sortProps = (key: string, defaultDir: SortDir = "desc") => ({
    sortKey: key,
    activeKey: values.sort_by,
    activeDir: sortDir,
    defaultDir,
    onSort: setFilter,
  });

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: values.sort_by,
    sort_dir: sortDir,
  });
  if (values.game_id) params.set("game_id", values.game_id);
  if (values.status) params.set("status", values.status);
  // The date inputs are whole days; the API wants instants. Converting here
  // (rather than in state) keeps the URL human-editable and shareable.
  if (values.date_from) {
    params.set("date_from", new Date(values.date_from).toISOString());
  }
  if (values.date_to) {
    params.set("date_to", new Date(`${values.date_to}T23:59:59`).toISOString());
  }

  const {
    data: roundsData,
    loading,
    refreshing,
  } = useAdminQuery<{ rounds: Round[]; total: number }>(
    `/api/admin/rounds?${params.toString()}`,
  );
  const rounds = roundsData?.rounds ?? [];
  const total = roundsData?.total ?? 0;

  // Shared cache key with the Tables page and every other table dropdown, so
  // this costs one request across the whole session.
  const { data: tablesData } = useAdminQuery<TableOption[]>("/api/admin/tables");
  const tables = tablesData ?? [];

  function handleClear() {
    setValues({ page: "1", game_id: "", status: "", date_from: "", date_to: "" });
  }

  const hasFilters =
    !!values.game_id || !!values.status || !!values.date_from || !!values.date_to;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.15)" as const,
  };

  /* Below md every control goes full width and grows to a 44px touch target.
     Above md nothing here applies, so the bar is byte-identical on desktop. */
  const controlClass =
    "rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]";

  /* Card mode below md: the round ID names the card and all four remaining
     columns stay \u2014 a round has nothing spare to drop. */
  const columns: Column<Round>[] = [
    {
      key: "external_fight_id",
      label: "Round ID",
      header: <SortHeader label="Round ID" {...sortProps("external_fight_id", "asc")} />,
      mobile: "title",
      render: (row) => (
        <span className="font-mono text-xs">{row.external_fight_id}</span>
      ),
    },
    {
      key: "game_name",
      label: "Table",
      mobile: "row",
      render: (row) => (
        <span>{row.game_name || row.external_game_id || "\u2014"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      header: <SortHeader label="Status" {...sortProps("status", "asc")} />,
      mobile: "row",
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
      header: <SortHeader label="Result" {...sortProps("result", "asc")} />,
      mobile: "row",
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
      header: <SortHeader label="Started" {...sortProps("started_at")} />,
      mobile: "row",
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
        <div className="flex flex-wrap gap-3 items-end max-md:flex-col max-md:items-stretch">
          <div className="max-md:w-full">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Table
            </label>
            <select
              value={values.game_id}
              onChange={(e) => setFilter({ game_id: e.target.value })}
              className={controlClass}
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
          <div className="max-md:w-full">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Status
            </label>
            <select
              value={values.status}
              onChange={(e) => setFilter({ status: e.target.value })}
              className={controlClass}
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
          <div className="max-md:w-full">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              From
            </label>
            <input
              type="date"
              value={values.date_from}
              onChange={(e) => setFilter({ date_from: e.target.value })}
              className={controlClass}
              style={inputStyle}
            />
          </div>
          <div className="max-md:w-full">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              To
            </label>
            <input
              type="date"
              value={values.date_to}
              onChange={(e) => setFilter({ date_to: e.target.value })}
              className={controlClass}
              style={inputStyle}
            />
          </div>
          {/* No "Filter" button: every control above applies on change and
              writes straight to the URL, so a separate apply step would only be
              a second way to do what already happened. */}
          {hasFilters && (
            <button
              onClick={handleClear}
              className="rounded-lg px-4 py-2 text-sm text-[#99a1af] hover:text-white transition-colors max-md:w-full max-md:min-h-[44px]"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <RefreshingHint show={refreshing && !loading} />

      {/* Results */}
      <DataTable
        columns={columns}
        data={rounds}
        loading={loading}
        emptyMessage="No rounds found"
        searchPlaceholder="Filter the rounds on this page..."
        onRowClick={(row) => router.push(`/admin/rounds/${row.id}`)}
        pageSize={pageSize}
        disablePagination
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        label="rounds"
        pageSize={pageSize}
        onPage={(p) => setValues({ page: String(p) })}
        onPageSize={(n) => setFilter({ page_size: String(n) })}
      />

    </div>
  );
}

export default function RoundsPage() {
  return (
    <UrlFilterBoundary>
      <RoundsPageInner />
    </UrlFilterBoundary>
  );
}
