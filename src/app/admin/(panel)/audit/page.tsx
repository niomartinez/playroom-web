"use client";

import { useState, useEffect } from "react";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import UrlFilterBoundary from "@/components/admin/ui/UrlFilterBoundary";
import { useAdminQuery } from "@/lib/admin-query";
import Pagination from "@/components/admin/ui/Pagination";
import { useUrlFilters } from "@/lib/use-url-filters";
import { useDebounce } from "@/lib/use-debounce";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  admin_display_name: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "#00bc7d",
  update: "#f0b100",
  soft_delete: "#fb2c36",
  deactivate: "#fb2c36",
  void_round: "#fb2c36",
  kick_player: "#fb2c36",
  regenerate_api_key: "#f0b100",
  update_config: "#2b7fff",
  force_close_all_tables: "#fb2c36",
  /* Closing pulls a live table out of the lobby — it reads as destructive
     because it is. Opening is the recovery, so it reads as safe. */
  close_table: "#fb2c36",
  open_table: "#00bc7d",
  /* The network check was deliberately skipped. Both outcomes are worth
     spotting in a scan of the log — the rejected one especially. */
  break_glass_used: "#f0b100",
  break_glass_rejected: "#fb2c36",
  create_admin_user: "#00bc7d",
  update_admin_user: "#f0b100",
  deactivate_admin_user: "#fb2c36",
};

function AuditPageInner() {
  const [expanded, setExpanded] = useState<string | null>(null);

  /* Every filter, the sort and the page size live in the URL. An audit view is
     the one people quote at each other — "this action, this week, sorted oldest
     first" is now a link — and revisiting one repaints from cache. */
  const { values, setValues, setFilter } = useUrlFilters({
    page: "1",
    page_size: "20",
    action: "",
    entity_type: "",
    q: "",
    date_from: "",
    date_to: "",
    sort_by: "created_at",
    sort_dir: "desc",
  });
  const page = Math.max(1, Number(values.page) || 1);
  const pageSize = Number(values.page_size) || 20;
  const sortBy = values.sort_by;
  const sortDir: "asc" | "desc" = values.sort_dir === "asc" ? "asc" : "desc";

  /* The search box is typed into, so it keeps local state; the URL is only
     written once typing settles, or every keystroke would be a router.replace
     AND a distinct cache key. */
  const [searchInput, setSearchInput] = useState(values.q);
  const debouncedSearch = useDebounce(searchInput, 350);
  useEffect(() => {
    if (debouncedSearch !== values.q) setFilter({ q: debouncedSearch });
  }, [debouncedSearch, values.q, setFilter]);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (values.action) params.set("action", values.action);
  if (values.entity_type) params.set("entity_type", values.entity_type);
  if (values.q.trim()) params.set("q", values.q.trim());
  // <input type="date"> gives a bare YYYY-MM-DD; widen it to cover the whole
  // local day so "to = today" doesn't exclude everything logged today.
  if (values.date_from) {
    params.set("date_from", new Date(`${values.date_from}T00:00:00`).toISOString());
  }
  if (values.date_to) {
    params.set("date_to", new Date(`${values.date_to}T23:59:59.999`).toISOString());
  }
  params.set("sort_by", sortBy);
  params.set("sort_dir", sortDir);

  const {
    data: auditData,
    loading,
    refreshing,
  } = useAdminQuery<{ entries: AuditEntry[]; total: number }>(
    `/api/admin/audit?${params.toString()}`,
  );
  const entries = auditData?.entries ?? [];
  const total = auditData?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.15)" as const,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Audit Log</h1>

      {/* Filters */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <div className="flex flex-wrap gap-3 items-end">
          {/* Below md every control is its own full-width row: the pinned
              min-w-[220px] and the intrinsic width of a date input together
              overflow a 390px screen. */}
          <div className="grow min-w-[220px] max-md:w-full max-md:min-w-0">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Search</label>
            <input
              type="text"
              placeholder="Action, entity, entity id or IP..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>
          <div className="max-md:w-full">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Action</label>
            <input
              type="text"
              placeholder="e.g. update, soft_delete"
              value={values.action}
              onChange={(e) => setFilter({ action: e.target.value })}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>
          <div className="max-md:w-full">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Entity Type</label>
            <select
              value={values.entity_type}
              onChange={(e) => setFilter({ entity_type: e.target.value })}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]"
              style={inputStyle}
            >
              <option value="">All</option>
              <option value="operator">System Provider</option>
              <option value="table">Table</option>
              <option value="round">Round</option>
              <option value="player">Player</option>
              <option value="system_config">Config</option>
              <option value="admin_user">Admin User</option>
              <option value="system">System</option>
              <option value="ip_allowlist">IP Allowlist</option>
            </select>
          </div>
          <div className="max-md:flex-1 max-md:min-w-[9rem]">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>From</label>
            <input
              type="date"
              value={values.date_from}
              onChange={(e) => setFilter({ date_from: e.target.value })}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>
          <div className="max-md:flex-1 max-md:min-w-[9rem]">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>To</label>
            <input
              type="date"
              value={values.date_to}
              onChange={(e) => setFilter({ date_to: e.target.value })}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>
          <div className="max-md:w-full">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Sort by</label>
            <select
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [col, dir] = e.target.value.split(":");
                setFilter({ sort_by: col, sort_dir: dir === "asc" ? "asc" : "desc" });
              }}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]"
              style={inputStyle}
            >
              <option value="created_at:desc">Newest first</option>
              <option value="created_at:asc">Oldest first</option>
              <option value="action:asc">Action A-Z</option>
              <option value="action:desc">Action Z-A</option>
              <option value="entity_type:asc">Entity A-Z</option>
              <option value="entity_type:desc">Entity Z-A</option>
            </select>
          </div>
          {/* "Per page" now lives with the pagination controls at the foot of
              the table, where the count it governs is. Two of them, in two
              places, was one too many. */}
          {(searchInput || values.action || values.entity_type || values.date_from || values.date_to) && (
            <button
              onClick={() => {
                setSearchInput("");
                setValues({
                  page: "1",
                  action: "",
                  entity_type: "",
                  q: "",
                  date_from: "",
                  date_to: "",
                });
              }}
              className="rounded-lg px-3 py-2 text-sm max-md:w-full max-md:min-h-[44px]"
              style={{ backgroundColor: "#262626", color: "#d1d5db" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <RefreshingHint show={refreshing && !loading} />

      {/* Log entries */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        {loading ? (
          <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>No audit entries found</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="px-6 py-4 cursor-pointer transition-colors hover:bg-white/[0.02] max-md:px-4"
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              >
                <div className="flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-2">
                  <div className="flex items-center gap-3 max-md:flex-wrap max-md:gap-y-1">
                    <span
                      className="text-xs font-semibold uppercase px-2 py-0.5 rounded"
                      style={{
                        color: ACTION_COLORS[entry.action] || "#99a1af",
                        backgroundColor: `${ACTION_COLORS[entry.action] || "#99a1af"}15`,
                      }}
                    >
                      {entry.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm text-white">{entry.entity_type}</span>
                    {entry.entity_id && (
                      <span className="text-xs font-mono" style={{ color: "#6a7282" }}>
                        {entry.entity_id.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-4 text-xs max-md:w-full max-md:flex-wrap max-md:gap-x-3 max-md:gap-y-1"
                    style={{ color: "#6a7282" }}
                  >
                    <span className="max-md:break-all">{entry.admin_display_name || entry.admin_email}</span>
                    <span>{new Date(entry.created_at).toLocaleString()}</span>
                    <span className="font-mono">{entry.ip_address}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === entry.id && (
                  /* One column below md: two JSON panes side by side on a
                     390px screen leaves ~170px each. Each pane keeps its own
                     horizontal scroll rather than widening the page. */
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {entry.old_value && (
                      <div>
                        <span className="text-xs font-medium" style={{ color: "#fb2c36" }}>Old Value</span>
                        <pre
                          className="mt-1 text-xs font-mono rounded-lg p-3 overflow-x-auto"
                          style={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#99a1af" }}
                        >
                          {JSON.stringify(entry.old_value, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.new_value && (
                      <div>
                        <span className="text-xs font-medium" style={{ color: "#00bc7d" }}>New Value</span>
                        <pre
                          className="mt-1 text-xs font-mono rounded-lg p-3 overflow-x-auto"
                          style={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#99a1af" }}
                        >
                          {JSON.stringify(entry.new_value, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          className="px-4 py-3"
          style={{ borderTop: "1px solid rgba(208,135,0,0.1)" }}
        >
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            label="entries"
            pageSize={pageSize}
            onPage={(p) => setValues({ page: String(p) })}
            onPageSize={(n) => setFilter({ page_size: String(n) })}
          />
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <UrlFilterBoundary>
      <AuditPageInner />
    </UrlFilterBoundary>
  );
}
