"use client";

import { useState, useEffect, useCallback } from "react";
import StatCard from "@/components/admin/ui/StatCard";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";

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

export default function MonitoringPage() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [errors, setErrors] = useState<WalletError[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorsLoading, setErrorsLoading] = useState(true);
  const [errorsTotal, setErrorsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitoring/stats");
      if (res.ok) {
        const json = await res.json();
        setStats(json.data ?? json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchErrors = useCallback(async () => {
    setErrorsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));

      const res = await fetch(`/api/admin/monitoring/wallet-errors?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setErrors(data.errors ?? []);
        setErrorsTotal(data.total ?? 0);
      }
    } catch {
      // silent
    } finally {
      setErrorsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchErrors(); }, [fetchErrors]);

  const totalPages = Math.max(1, Math.ceil(errorsTotal / pageSize));

  const errorColumns: Column<WalletError>[] = [
    {
      key: "operation",
      label: "Operation",
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
      render: (row) => (
        <span className="text-xs max-w-[300px] truncate block" title={row.error_message}>
          {row.error_message}
        </span>
      ),
    },
    {
      key: "http_status",
      label: "HTTP",
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: "#99a1af" }}>
          {row.http_status ?? "\u2014"}
        </span>
      ),
    },
    {
      key: "retries",
      label: "Retries",
      render: (row) => <span className="font-mono text-xs">{row.retries}</span>,
    },
    {
      key: "created_at",
      label: "Time",
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

      {/* Stats cards */}
      {loading ? (
        <div className="text-center py-8" style={{ color: "#6a7282" }}>Loading...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Wallet Errors (24h)"
              value={stats.wallet_errors_24h}
              color={stats.wallet_errors_24h > 0 ? "#fb2c36" : "#00bc7d"}
            />
            <StatCard label="Wallet Errors (Total)" value={stats.wallet_errors_total} />
            <StatCard label="WebSocket Connections" value={stats.websocket_connections} color="#2b7fff" />
            <StatCard
              label="API Errors (24h)"
              value={stats.api_errors_24h}
              color={stats.api_errors_24h > 0 ? "#fb2c36" : "#00bc7d"}
            />
          </div>

          {/* Error breakdown by operation */}
          {Object.keys(stats.wallet_errors_by_operation).length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#d08700" }}>
                Errors by Operation (24h)
              </h3>
              <div className="flex gap-4">
                {Object.entries(stats.wallet_errors_by_operation).map(([op, count]) => (
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

      {/* Wallet error log */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d08700" }}>
            Wallet Error Log ({errorsTotal})
          </h2>
        </div>

        <DataTable
          columns={errorColumns}
          data={errors}
          loading={errorsLoading}
          emptyMessage="No wallet errors"
          pageSize={pageSize}
          disablePagination
        />

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 text-xs"
            style={{ borderTop: "1px solid rgba(208,135,0,0.1)", color: "#6a7282" }}
          >
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5"
                style={{ color: "#99a1af" }}
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5"
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
