"use client";

import { useState, useEffect, useCallback } from "react";
import StatCard from "@/components/admin/ui/StatCard";

interface Summary {
  total_wagered: number;
  total_payout: number;
  ggr: number;
  bet_count: number;
  round_count: number;
}

interface BreakdownEntry {
  operator_id?: string;
  operator_name?: string;
  table_id?: string;
  table_name?: string;
  external_game_id?: string;
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

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(daysAgoISO(7));
  const [dateTo, setDateTo] = useState(todayISO());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byOperator, setByOperator] = useState<BreakdownEntry[]>([]);
  const [byTable, setByTable] = useState<BreakdownEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"operator" | "table">("operator");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo) params.set("date_to", new Date(dateTo + "T23:59:59").toISOString());
    const qs = params.toString();

    try {
      const [summaryRes, operatorRes, tableRes] = await Promise.allSettled([
        fetch(`/api/admin/reports/summary?${qs}`).then((r) => r.json()),
        fetch(`/api/admin/reports/by-operator?${qs}`).then((r) => r.json()),
        fetch(`/api/admin/reports/by-table?${qs}`).then((r) => r.json()),
      ]);

      if (summaryRes.status === "fulfilled") {
        const d = summaryRes.value.data ?? summaryRes.value;
        setSummary(d);
      }
      if (operatorRes.status === "fulfilled") {
        const d = operatorRes.value.data ?? operatorRes.value;
        setByOperator(Array.isArray(d) ? d : []);
      }
      if (tableRes.status === "fulfilled") {
        const d = tableRes.value.data ?? tableRes.value;
        setByTable(Array.isArray(d) ? d : []);
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

  function fmt(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2 });
  }

  const breakdownData = activeTab === "operator" ? byOperator : byTable;

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

          {/* Preset buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setDateFrom(todayISO()); setDateTo(todayISO()); }}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Today
            </button>
            <button
              onClick={() => { setDateFrom(daysAgoISO(7)); setDateTo(todayISO()); }}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              7 Days
            </button>
            <button
              onClick={() => { setDateFrom(daysAgoISO(30)); setDateTo(todayISO()); }}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              30 Days
            </button>
            <button
              onClick={() => { setDateFrom(monthStartISO()); setDateTo(todayISO()); }}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="text-center py-8" style={{ color: "#6a7282" }}>
          Loading reports...
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <StatCard label="Total Wagered" value={fmt(summary.total_wagered)} />
            <StatCard label="Total Payout" value={fmt(summary.total_payout)} />
            <StatCard
              label="GGR"
              value={fmt(summary.ggr)}
              color={summary.ggr >= 0 ? "#00bc7d" : "#fb2c36"}
            />
            <StatCard label="Bets" value={summary.bet_count.toLocaleString()} />
            <StatCard label="Rounds" value={summary.round_count.toLocaleString()} />
          </div>

          {/* Breakdown tabs */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "#171717",
              border: "1px solid rgba(208,135,0,0.2)",
            }}
          >
            {/* Tab header */}
            <div
              className="flex"
              style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}
            >
              {(["operator", "table"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors"
                  style={{
                    color: activeTab === tab ? "#f0b100" : "#6a7282",
                    borderBottom:
                      activeTab === tab
                        ? "2px solid #f0b100"
                        : "2px solid transparent",
                  }}
                >
                  By {tab}
                </button>
              ))}
            </div>

            {/* Breakdown table */}
            {breakdownData.length === 0 ? (
              <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>
                No data for this period
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
                        {activeTab === "operator" ? "Operator" : "Table"}
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
                    {breakdownData.map((row, i) => {
                      const name =
                        activeTab === "operator"
                          ? row.operator_name
                          : row.table_name;
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <td className="px-4 py-3 text-white font-medium">
                            {name || "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-white">
                            {fmt(row.total_wagered)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-white">
                            {fmt(row.total_payout)}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-mono font-semibold"
                            style={{
                              color: row.ggr >= 0 ? "#00bc7d" : "#fb2c36",
                            }}
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
                      );
                    })}

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
                        {fmt(
                          breakdownData.reduce(
                            (s, r) => s + r.total_wagered,
                            0
                          )
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                        {fmt(
                          breakdownData.reduce(
                            (s, r) => s + r.total_payout,
                            0
                          )
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold"
                        style={{
                          color:
                            breakdownData.reduce((s, r) => s + r.ggr, 0) >= 0
                              ? "#00bc7d"
                              : "#fb2c36",
                        }}
                      >
                        {fmt(breakdownData.reduce((s, r) => s + r.ggr, 0))}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-semibold"
                        style={{ color: "#99a1af" }}
                      >
                        {breakdownData
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
      ) : (
        <div className="text-center py-8" style={{ color: "#6a7282" }}>
          No report data available
        </div>
      )}
    </div>
  );
}
