"use client";

import { Suspense } from "react";
import StatCard from "@/components/admin/ui/StatCard";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import { useAdminQuery } from "@/lib/admin-query";
import { useUrlFilters } from "@/lib/use-url-filters";

interface MonitoringStats {
  wallet_errors_total: number;
  wallet_errors_24h: number;
  wallet_errors_by_operation: Record<string, number>;
  websocket_connections: number;
  api_requests_24h: number;
  api_errors_24h: number;
}

interface WalletError {
  id: string;
  player_id: string | null;
  bet_id: string | null;
  operation: string;
  transaction_id: string | null;
  error_message: string;
  http_status: number | null;
  retries: number;
  created_at: string;
  [key: string]: unknown;
}

interface ApiError {
  id: string;
  api_request_id: string;
  endpoint: string;
  method: string;
  client_id: string | null;
  response_code: number;
  message: string;
  error_code: string | null;
  processing_time_ms: number | null;
  created_at: string;
  [key: string]: unknown;
}

interface ApiErrorGroup {
  endpoint: string;
  method: string | null;
  response_code: number;
  count: number;
  last_seen: string;
  sample_message: string;
}

const PAGE_SIZE = 15;

/** Red for 5xx (ours), amber for 4xx (usually a caller sending us bad input). */
function statusColor(code: number): string {
  if (code >= 500) return "#fb2c36";
  if (code >= 400) return "#f0b100";
  return "#99a1af";
}

const WINDOWS = [
  { label: "24h", value: "24" },
  { label: "7d", value: "168" },
  { label: "30d", value: "720" },
];

function MonitoringPageInner() {
  const { values, setValues, setFilter } = useUrlFilters({
    page: "1",
    apiPage: "1",
    hours: "24",
    status: "",
    endpoint: "",
    view: "",
  });

  const page = Math.max(1, parseInt(values.page, 10) || 1);
  const apiPage = Math.max(1, parseInt(values.apiPage, 10) || 1);
  const showApiErrors = values.view === "api-errors";

  const stats = useAdminQuery<MonitoringStats>("/api/admin/monitoring/stats");

  const walletUrl = `/api/admin/monitoring/wallet-errors?page=${page}&page_size=${PAGE_SIZE}`;
  const wallet = useAdminQuery<{ errors: WalletError[]; total: number }>(walletUrl);

  const apiParams = new URLSearchParams({
    page: String(apiPage),
    page_size: String(PAGE_SIZE),
    hours: values.hours,
  });
  if (values.status) apiParams.set("status_code", values.status);
  if (values.endpoint) apiParams.set("endpoint", values.endpoint);
  // Only fetched once the section is open, so the page costs nothing extra for
  // an operator who never drills in.
  const apiErrors = useAdminQuery<{
    entries: ApiError[];
    total: number;
    breakdown: ApiErrorGroup[];
    breakdown_truncated: boolean;
  }>(`/api/admin/monitoring/api-errors?${apiParams.toString()}`, {
    enabled: showApiErrors,
  });

  const walletErrors = wallet.data?.errors ?? [];
  const walletTotal = wallet.data?.total ?? 0;
  const walletPages = Math.max(1, Math.ceil(walletTotal / PAGE_SIZE));
  const apiTotal = apiErrors.data?.total ?? 0;
  const apiPages = Math.max(1, Math.ceil(apiTotal / PAGE_SIZE));

  const errorColumns: Column<WalletError>[] = [
    {
      key: "operation",
      label: "Operation",
      mobile: "row",
      render: (row) => (
        <span className="text-xs font-semibold uppercase" style={{
          color: row.operation === "credit" ? "#00bc7d" : row.operation === "debit" ? "#fb2c36" : "#f0b100"
        }}>
          {row.operation}
        </span>
      ),
    },
    {
      key: "error_message",
      label: "Error",
      // The message is what identifies the row, so it heads the card. It only
      // truncates in the table, where a column has a width to respect; on a
      // card there is nothing to the right of it and it wraps instead.
      mobile: "title",
      render: (row) => (
        <span className="text-xs block md:max-w-[300px] md:truncate" title={row.error_message}>
          {row.error_message}
        </span>
      ),
    },
    {
      key: "http_status",
      label: "HTTP",
      mobile: "row",
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: "#99a1af" }}>
          {row.http_status ?? "—"}
        </span>
      ),
    },
    {
      key: "retries",
      label: "Retries",
      mobile: "row",
      render: (row) => <span className="font-mono text-xs">{row.retries}</span>,
    },
    {
      key: "created_at",
      label: "Time",
      mobile: "row",
      render: (row) => (
        <span className="text-xs" style={{ color: "#99a1af" }}>
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  const apiColumns: Column<ApiError>[] = [
    {
      key: "response_code",
      label: "Status",
      mobile: "row",
      render: (row) => (
        <span className="font-mono text-xs font-bold" style={{ color: statusColor(row.response_code) }}>
          {row.response_code}
        </span>
      ),
    },
    {
      key: "endpoint",
      label: "Endpoint",
      // Method + path names the row; the status and reason hang off it.
      mobile: "title",
      render: (row) => (
        <span className="text-xs font-mono break-all md:break-normal">
          <span style={{ color: "#6a7282" }}>{row.method} </span>
          {row.endpoint}
        </span>
      ),
    },
    {
      key: "message",
      label: "Reason",
      mobile: "row",
      render: (row) => (
        <span className="text-xs block md:max-w-[380px] md:truncate" title={row.message}>
          {row.message || "—"}
          {row.error_code && (
            <span className="ml-1 font-mono" style={{ color: "#6a7282" }}>
              ({row.error_code})
            </span>
          )}
        </span>
      ),
    },
    {
      key: "processing_time_ms",
      label: "Took",
      mobile: "row",
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: "#99a1af" }}>
          {row.processing_time_ms != null ? `${row.processing_time_ms}ms` : "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Time",
      mobile: "row",
      render: (row) => (
        <span className="text-xs" style={{ color: "#99a1af" }}>
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Monitoring</h1>

      {stats.loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-5 animate-pulse"
              style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)", height: 104 }}
            />
          ))}
        </div>
      ) : stats.data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Wallet Errors (24h)"
              value={stats.data.wallet_errors_24h}
              color={stats.data.wallet_errors_24h > 0 ? "#fb2c36" : "#00bc7d"}
            />
            <StatCard label="Wallet Errors (Total)" value={stats.data.wallet_errors_total} />
            <StatCard label="WebSocket Connections" value={stats.data.websocket_connections} color="#2b7fff" />
            <StatCard
              label="API Errors (24h)"
              value={stats.data.api_errors_24h}
              color={stats.data.api_errors_24h > 0 ? "#fb2c36" : "#00bc7d"}
              hint={showApiErrors ? "Hide details" : "Click to see what failed"}
              onClick={() => setValues({ view: showApiErrors ? "" : "api-errors" })}
            />
          </div>

          {/* Error breakdown by operation */}
          {Object.keys(stats.data.wallet_errors_by_operation).length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#d08700" }}>
                Errors by Operation (24h)
              </h3>
              <div className="flex gap-4 max-md:flex-wrap max-md:gap-x-6 max-md:gap-y-3">
                {Object.entries(stats.data.wallet_errors_by_operation).map(([op, count]) => (
                  <div key={op} className="text-center">
                    <span className="text-lg font-bold text-white">{count}</span>
                    <p className="text-xs uppercase" style={{ color: "#6a7282" }}>{op}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* ── API errors drill-down ── */}
      {showApiErrors && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
        >
          <div
            className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 max-md:px-4"
            style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d08700" }}>
              API Errors ({apiTotal})
              {apiErrors.refreshing && (
                <span className="ml-2 font-normal normal-case" style={{ color: "#6a7282" }}>
                  refreshing…
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2 max-md:w-full max-md:flex-wrap">
              {(values.status || values.endpoint) && (
                <button
                  onClick={() => setFilter({ status: "", endpoint: "" })}
                  className="rounded px-3 py-1 text-xs hover:bg-white/5 max-md:min-h-[44px] max-md:flex-1 max-md:px-4"
                  style={{ color: "#f0b100", border: "1px solid rgba(240,177,0,0.35)" }}
                >
                  Clear filter
                </button>
              )}
              <div
                className="flex rounded overflow-hidden max-md:flex-1"
                style={{ border: "1px solid rgba(208,135,0,0.25)" }}
              >
                {WINDOWS.map((w) => (
                  <button
                    key={w.value}
                    onClick={() => setFilter({ hours: w.value, apiPage: "1" })}
                    className="px-3 py-1 text-xs max-md:min-h-[44px] max-md:flex-1"
                    style={{
                      backgroundColor: values.hours === w.value ? "rgba(208,135,0,0.18)" : "transparent",
                      color: values.hours === w.value ? "#f0b100" : "#99a1af",
                    }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {apiErrors.error && (
            <div className="px-6 py-3 text-xs" style={{ color: "#fb2c36" }}>
              {apiErrors.error}
            </div>
          )}

          {/* Grouped first: one repeated fault and a scatter of unrelated ones
              need completely different responses, and the raw list alone does
              not distinguish them. Each row filters the table below. */}
          {(apiErrors.data?.breakdown?.length ?? 0) > 0 && (
            <div className="px-6 py-4 space-y-2 max-md:px-4" style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6a7282" }}>
                Grouped by endpoint
              </h3>
              {apiErrors.data?.breakdown_truncated && (
                <p className="text-xs" style={{ color: "#f0b100" }}>
                  Showing the most recent 5,000 errors only — counts below are a floor, not a total.
                </p>
              )}
              <div className="space-y-1">
                {apiErrors.data?.breakdown.map((g) => {
                  const active =
                    values.endpoint === g.endpoint && values.status === String(g.response_code);
                  return (
                    <button
                      key={`${g.endpoint}-${g.response_code}`}
                      onClick={() =>
                        setFilter(
                          active
                            ? { status: "", endpoint: "" }
                            : { status: String(g.response_code), endpoint: g.endpoint },
                        )
                      }
                      className="w-full flex items-center gap-3 rounded px-3 py-2 text-left hover:bg-white/5 max-md:min-h-[44px] max-md:flex-wrap max-md:gap-y-1"
                      style={{
                        backgroundColor: active ? "rgba(208,135,0,0.12)" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <span
                        className="font-mono text-xs font-bold shrink-0 w-10"
                        style={{ color: statusColor(g.response_code) }}
                      >
                        {g.response_code}
                      </span>
                      <span className="font-mono text-xs shrink-0 text-white max-md:shrink max-md:break-all">
                        {g.endpoint}
                      </span>
                      {/* On a card-width screen the sample message takes its own
                          line and wraps; truncating it there hides the only clue
                          to what actually failed. */}
                      <span
                        className="text-xs truncate flex-1 max-md:w-full max-md:flex-none max-md:overflow-visible max-md:whitespace-normal"
                        style={{ color: "#99a1af" }}
                        title={g.sample_message}
                      >
                        {g.sample_message}
                      </span>
                      <span className="text-xs font-bold shrink-0 text-white">{g.count}×</span>
                      <span className="text-xs shrink-0" style={{ color: "#6a7282" }}>
                        {new Date(g.last_seen).toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DataTable
            columns={apiColumns}
            data={apiErrors.data?.entries ?? []}
            loading={apiErrors.loading}
            emptyMessage="No API errors in this window"
            pageSize={PAGE_SIZE}
            disablePagination
          />

          {apiPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3 text-xs max-md:flex-col max-md:items-stretch max-md:gap-3"
              style={{ borderTop: "1px solid rgba(208,135,0,0.1)", color: "#6a7282" }}
            >
              <span className="max-md:text-center">Page {apiPage} of {apiPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={apiPage <= 1}
                  onClick={() => setValues({ apiPage: String(apiPage - 1) })}
                  className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5 max-md:flex-1 max-md:min-h-[44px]"
                  style={{ color: "#99a1af" }}
                >
                  Prev
                </button>
                <button
                  disabled={apiPage >= apiPages}
                  onClick={() => setValues({ apiPage: String(apiPage + 1) })}
                  className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5 max-md:flex-1 max-md:min-h-[44px]"
                  style={{ color: "#99a1af" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wallet error log */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <div className="px-6 py-4 max-md:px-4" style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d08700" }}>
            Wallet Error Log ({walletTotal})
            {wallet.refreshing && (
              <span className="ml-2 font-normal normal-case" style={{ color: "#6a7282" }}>
                refreshing…
              </span>
            )}
          </h2>
        </div>

        <DataTable
          columns={errorColumns}
          data={walletErrors}
          loading={wallet.loading}
          emptyMessage="No wallet errors"
          pageSize={PAGE_SIZE}
          disablePagination
        />

        {walletPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 text-xs max-md:flex-col max-md:items-stretch max-md:gap-3"
            style={{ borderTop: "1px solid rgba(208,135,0,0.1)", color: "#6a7282" }}
          >
            <span className="max-md:text-center">Page {page} of {walletPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setValues({ page: String(page - 1) })}
                className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5 max-md:flex-1 max-md:min-h-[44px]"
                style={{ color: "#99a1af" }}
              >
                Prev
              </button>
              <button
                disabled={page >= walletPages}
                onClick={() => setValues({ page: String(page + 1) })}
                className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5 max-md:flex-1 max-md:min-h-[44px]"
                style={{ color: "#99a1af" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  // useUrlFilters reads useSearchParams, which forces a prerender bailout
  // without a Suspense boundary — the build fails otherwise.
  return (
    <Suspense fallback={<div className="text-center py-8" style={{ color: "#6a7282" }}>Loading…</div>}>
      <MonitoringPageInner />
    </Suspense>
  );
}
