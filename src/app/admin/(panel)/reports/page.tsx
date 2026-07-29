"use client";

import StatCard from "@/components/admin/ui/StatCard";
import MobileCardList, {
  type MobileCardItem,
} from "@/components/admin/ui/MobileCardList";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import UrlFilterBoundary from "@/components/admin/ui/UrlFilterBoundary";
import { useAdminQuery } from "@/lib/admin-query";
import { useUrlFilters } from "@/lib/use-url-filters";

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

/* Date preset helpers.
 *
 * These format the viewer's LOCAL date. toISOString() is UTC, and Manila is
 * UTC+8: between midnight and 08:00 local, UTC is still the previous day, so
 * clicking "Today" before 8am showed YESTERDAY. Same drift silently shifted
 * "Last 7 days" and "This month" by one day for the whole early shift. */
function localISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayISO(): string {
  return localISO(new Date());
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localISO(d);
}

function monthStartISO(): string {
  const d = new Date();
  return localISO(new Date(d.getFullYear(), d.getMonth(), 1));
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

function ReportsPageInner() {
  /* Period and tab live in the URL. Reports are the page people paste at each
     other — "the numbers for last month, by table" is now a link rather than a
     set of instructions — and re-picking a period you looked at minutes ago
     repaints from cache instead of re-running three aggregations. */
  const { values, setValues } = useUrlFilters({
    date_from: daysAgoISO(7),
    date_to: todayISO(),
    tab: "operator",
  });
  const dateFrom = values.date_from;
  const dateTo = values.date_to;
  const activeTab: "operator" | "table" = values.tab === "table" ? "table" : "operator";

  const params = new URLSearchParams();
  // "2026-07-27" alone parses as UTC midnight = 08:00 in Manila, which
  // silently dropped the first 8 hours of the day from every report. The
  // explicit time makes it parse as LOCAL midnight, matching date_to below.
  if (dateFrom) params.set("date_from", new Date(dateFrom + "T00:00:00").toISOString());
  if (dateTo) params.set("date_to", new Date(dateTo + "T23:59:59").toISOString());
  const qs = params.toString();

  // Three independent cache keys rather than one combined fetch: switching the
  // operator/table tab needs no request at all (both breakdowns are already
  // cached for this period), and a slow aggregation no longer holds up the two
  // that finished.
  const summaryQ = useAdminQuery<Summary>(`/api/admin/reports/summary?${qs}`);
  const operatorQ = useAdminQuery<BreakdownEntry[]>(`/api/admin/reports/by-operator?${qs}`);
  const tableQ = useAdminQuery<BreakdownEntry[]>(`/api/admin/reports/by-table?${qs}`);

  const summary = summaryQ.data ?? null;
  const byOperator = operatorQ.data ?? [];
  const byTable = tableQ.data ?? [];
  const loading = summaryQ.loading || operatorQ.loading || tableQ.loading;
  const refreshing = summaryQ.refreshing || operatorQ.refreshing || tableQ.refreshing;

  const setRange = (from: string, to: string) =>
    setValues({ date_from: from, date_to: to });

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.15)" as const,
  };

  function fmt(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2 });
  }

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["Playroom Gaming — GGR Report"],
      ["Period", `${dateFrom} to ${dateTo}`],
      [],
      ["Summary"],
      ["Total Wagered", "Total Payout", "GGR", "Bets", "Rounds"],
      summary
        ? [summary.total_wagered, summary.total_payout, summary.ggr, summary.bet_count, summary.round_count]
        : ["-", "-", "-", "-", "-"],
      [],
      ["By System Provider"],
      ["System Provider", "Wagered", "Payout", "GGR", "Bets"],
      ...byOperator.map((r) => [r.operator_name || "Unknown", r.total_wagered, r.total_payout, r.ggr, r.bet_count]),
      [],
      ["By Table"],
      ["Table", "Wagered", "Payout", "GGR", "Bets"],
      ...byTable.map((r) => [r.table_name || "Unknown", r.total_wagered, r.total_payout, r.ggr, r.bet_count]),
    ];
    downloadCsv(`ggr-report_${dateFrom}_${dateTo}.csv`, rows);
  }

  const breakdownData = activeTab === "operator" ? byOperator : byTable;

  const totalWagered = breakdownData.reduce((s, r) => s + r.total_wagered, 0);
  const totalPayout = breakdownData.reduce((s, r) => s + r.total_payout, 0);
  const totalGgr = breakdownData.reduce((s, r) => s + r.ggr, 0);
  const totalBets = breakdownData.reduce((s, r) => s + r.bet_count, 0);

  /* Below md the five-column breakdown becomes one card per row, with the
     totals row as a final card. Four right-aligned money columns squashed into
     390px are unreadable, and side-scrolling a report you are reading top to
     bottom is worse. */
  const money = (v: number, style?: React.CSSProperties) => (
    <span className="font-mono" style={style}>
      {fmt(v)}
    </span>
  );

  const breakdownCards: MobileCardItem[] = [
    ...breakdownData.map((row, i) => {
      const name = activeTab === "operator" ? row.operator_name : row.table_name;
      return {
        id: i,
        title: name || "Unknown",
        rows: [
          { label: "Wagered", value: money(row.total_wagered) },
          { label: "Payout", value: money(row.total_payout) },
          {
            label: "GGR",
            value: money(row.ggr, {
              color: row.ggr >= 0 ? "#00bc7d" : "#fb2c36",
              fontWeight: 600,
            }),
          },
          {
            label: "Bets",
            value: (
              <span className="font-mono" style={{ color: "#99a1af" }}>
                {row.bet_count.toLocaleString()}
              </span>
            ),
          },
        ],
      };
    }),
    {
      id: "total",
      title: (
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#d08700" }}>
          Total
        </span>
      ),
      rows: [
        { label: "Wagered", value: money(totalWagered) },
        { label: "Payout", value: money(totalPayout) },
        {
          label: "GGR",
          value: money(totalGgr, {
            color: totalGgr >= 0 ? "#00bc7d" : "#fb2c36",
            fontWeight: 700,
          }),
        },
        {
          label: "Bets",
          value: (
            <span className="font-mono" style={{ color: "#99a1af" }}>
              {totalBets.toLocaleString()}
            </span>
          ),
        },
      ],
    },
  ];

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
          {/* The two date inputs share a row below md; the presets become a
              2-up grid and the export button its own full-width row. */}
          <div className="max-md:flex-1 max-md:min-w-[9rem]">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setValues({ date_from: e.target.value })}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>
          <div className="max-md:flex-1 max-md:min-w-[9rem]">
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setValues({ date_to: e.target.value })}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>

          {/* Preset buttons */}
          <div className="flex gap-2 max-md:grid max-md:w-full max-md:grid-cols-2">
            <button
              onClick={() => setRange(todayISO(), todayISO())}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors max-md:min-h-[44px]"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Today
            </button>
            <button
              onClick={() => setRange(daysAgoISO(7), todayISO())}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors max-md:min-h-[44px]"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              7 Days
            </button>
            <button
              onClick={() => setRange(daysAgoISO(30), todayISO())}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors max-md:min-h-[44px]"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              30 Days
            </button>
            <button
              onClick={() => setRange(monthStartISO(), todayISO())}
              className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors max-md:min-h-[44px]"
              style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              This Month
            </button>
          </div>

          <button
            onClick={exportCsv}
            disabled={loading || !summary}
            className="ml-auto rounded-lg px-4 py-2 text-xs font-bold transition hover:brightness-110 disabled:opacity-40 max-md:ml-0 max-md:w-full max-md:min-h-[44px]"
            style={{ backgroundColor: "#f0b100", color: "#000" }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <RefreshingHint show={refreshing && !loading} />

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
                  onClick={() => setValues({ tab })}
                  className="px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors max-md:flex-1 max-md:min-h-[44px] max-md:px-3"
                  style={{
                    color: activeTab === tab ? "#f0b100" : "#6a7282",
                    borderBottom:
                      activeTab === tab
                        ? "2px solid #f0b100"
                        : "2px solid transparent",
                  }}
                >
                  By {tab === "operator" ? "System Provider" : "Table"}
                </button>
              ))}
            </div>

            {/* Breakdown table */}
            {breakdownData.length === 0 ? (
              <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>
                No data for this period
              </div>
            ) : (
              <>
              <div className="md:hidden px-4 py-4">
                <MobileCardList items={breakdownCards} />
              </div>

              <div className="overflow-x-auto max-md:hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}>
                      <th
                        className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                        style={{ color: "#d08700" }}
                      >
                        {activeTab === "operator" ? "System Provider" : "Table"}
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
                        {fmt(totalWagered)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                        {fmt(totalPayout)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold"
                        style={{
                          color: totalGgr >= 0 ? "#00bc7d" : "#fb2c36",
                        }}
                      >
                        {fmt(totalGgr)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-semibold"
                        style={{ color: "#99a1af" }}
                      >
                        {totalBets.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              </>
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

export default function ReportsPage() {
  return (
    <UrlFilterBoundary>
      <ReportsPageInner />
    </UrlFilterBoundary>
  );
}
