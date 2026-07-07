"use client";

import { useState, useEffect, useCallback } from "react";
import StatCard from "@/components/admin/ui/StatCard";

interface Summary {
  total_wagered: number;
  total_payout: number;
  ggr: number;
  bet_count: number;
  date_from?: string;
  date_to?: string;
}

interface MonthlyRow {
  month: string;
  total_wagered: number;
  total_payout: number;
  ggr: number;
  bet_count: number;
}

/* Date preset helpers */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function monthStartISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

/* CSV export helpers */
function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmt(n: number): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function OcmsReportsPage() {
  const [dateFrom, setDateFrom] = useState(daysAgoISO(30));
  const [dateTo, setDateTo] = useState(todayISO());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo)
      params.set("date_to", new Date(dateTo + "T23:59:59").toISOString());
    const qs = params.toString();

    try {
      const [summaryRes, monthlyRes] = await Promise.allSettled([
        fetch(`/api/admin-ocms/reports/summary?${qs}`).then((r) => r.json()),
        fetch(`/api/admin-ocms/reports/monthly?months=12`).then((r) => r.json()),
      ]);

      if (summaryRes.status === "fulfilled") {
        const d = summaryRes.value.data ?? summaryRes.value;
        setSummary(d);
      }
      if (monthlyRes.status === "fulfilled") {
        const d = monthlyRes.value.data ?? monthlyRes.value;
        setMonthly(Array.isArray(d) ? d : []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.15)" as const,
  };

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["Play Room Gaming — Partner GGR Report"],
      ["Period", `${dateFrom} to ${dateTo}`],
      [],
      ["Summary"],
      ["Total Wagered", "Total Payout", "GGR", "Bets"],
      summary
        ? [summary.total_wagered, summary.total_payout, summary.ggr, summary.bet_count]
        : ["-", "-", "-", "-"],
      [],
      ["Monthly Accounting"],
      ["Month", "Wagered", "Payout", "GGR", "Bets"],
      ...monthly.map((r) => [
        r.month,
        r.total_wagered,
        r.total_payout,
        r.ggr,
        r.bet_count,
      ]),
    ];
    downloadCsv(`partner-ggr-report_${dateFrom}_${dateTo}.csv`, rows);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>

      {/* Date range picker */}
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
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
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

          {/* Preset buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDateFrom(todayISO());
                setDateTo(todayISO());
              }}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Today
            </button>
            <button
              onClick={() => {
                setDateFrom(daysAgoISO(7));
                setDateTo(todayISO());
              }}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              7 Days
            </button>
            <button
              onClick={() => {
                setDateFrom(daysAgoISO(30));
                setDateTo(todayISO());
              }}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              30 Days
            </button>
            <button
              onClick={() => {
                setDateFrom(monthStartISO());
                setDateTo(todayISO());
              }}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              This Month
            </button>
          </div>

          <button
            onClick={exportCsv}
            disabled={loading || !summary}
            className="ml-auto rounded-lg px-4 py-2 text-xs font-bold transition hover:brightness-110 disabled:opacity-40"
            style={{ backgroundColor: "#f0b100", color: "#000" }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="text-center py-8" style={{ color: "#6a7282" }}>
          Loading reports...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Wagered" value={fmt(summary?.total_wagered ?? 0)} />
            <StatCard label="Total Payout" value={fmt(summary?.total_payout ?? 0)} />
            <StatCard
              label="GGR"
              value={fmt(summary?.ggr ?? 0)}
              color={(summary?.ggr ?? 0) >= 0 ? "#00bc7d" : "#fb2c36"}
            />
            <StatCard
              label="Bets"
              value={(summary?.bet_count ?? 0).toLocaleString()}
            />
          </div>

          {/* Monthly accounting */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "#171717",
              border: "1px solid rgba(208,135,0,0.2)",
            }}
          >
            <div
              className="px-6 py-4"
              style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}
            >
              <h2
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: "#d08700" }}
              >
                Monthly Accounting
              </h2>
            </div>

            {monthly.length === 0 ? (
              <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>
                No monthly data
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}>
                      <th
                        className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                        style={{ color: "#d08700" }}
                      >
                        Month
                      </th>
                      {["Wagered", "Payout", "GGR", "Bets"].map((h) => (
                        <th
                          key={h}
                          className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                          style={{ color: "#d08700" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((row) => (
                      <tr
                        key={row.month}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      >
                        <td className="px-4 py-3 text-white font-medium">
                          {row.month}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white">
                          {fmt(row.total_wagered)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white">
                          {fmt(row.total_payout)}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-mono font-semibold"
                          style={{ color: row.ggr >= 0 ? "#00bc7d" : "#fb2c36" }}
                        >
                          {fmt(row.ggr)}
                        </td>
                        <td
                          className="px-4 py-3 text-right font-mono"
                          style={{ color: "#99a1af" }}
                        >
                          {row.bet_count.toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {/* Totals row */}
                    <tr
                      style={{
                        borderTop: "1px solid rgba(208,135,0,0.2)",
                        backgroundColor: "rgba(208,135,0,0.05)",
                      }}
                    >
                      <td
                        className="px-4 py-3 font-semibold text-xs uppercase"
                        style={{ color: "#d08700" }}
                      >
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                        {fmt(monthly.reduce((s, r) => s + r.total_wagered, 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                        {fmt(monthly.reduce((s, r) => s + r.total_payout, 0))}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold"
                        style={{
                          color:
                            monthly.reduce((s, r) => s + r.ggr, 0) >= 0
                              ? "#00bc7d"
                              : "#fb2c36",
                        }}
                      >
                        {fmt(monthly.reduce((s, r) => s + r.ggr, 0))}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-semibold"
                        style={{ color: "#99a1af" }}
                      >
                        {monthly
                          .reduce((s, r) => s + r.bet_count, 0)
                          .toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
