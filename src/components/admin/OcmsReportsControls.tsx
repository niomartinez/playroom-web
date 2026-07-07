"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OcmsSummary, OcmsMonthlyRow } from "@/lib/ocms-server";

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

/**
 * Interactive controls for the Reports RSC: the date range lives in the URL
 * (?from=…&to=…) so the server re-fetches — no client data fetching. The CSV
 * export uses the already-server-rendered summary/monthly data passed in.
 */
export default function OcmsReportsControls({
  dateFrom,
  dateTo,
  summary,
  monthly,
}: {
  dateFrom: string;
  dateTo: string;
  summary: OcmsSummary | null;
  monthly: OcmsMonthlyRow[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(dateFrom);
  const [to, setTo] = useState(dateTo);

  function apply(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    const params = new URLSearchParams();
    params.set("from", nextFrom);
    params.set("to", nextTo);
    router.push(`/admin-ocms/reports?${params.toString()}`);
  }

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
            value={from}
            onChange={(e) => setFrom(e.target.value)}
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
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>

        <button
          onClick={() => apply(from, to)}
          className="rounded-lg px-4 py-2 text-xs font-semibold text-black transition hover:brightness-110"
          style={{ backgroundColor: "#f0b100" }}
        >
          Apply
        </button>

        {/* Preset buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => apply(todayISO(), todayISO())}
            className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
            style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Today
          </button>
          <button
            onClick={() => apply(daysAgoISO(7), todayISO())}
            className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
            style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            7 Days
          </button>
          <button
            onClick={() => apply(daysAgoISO(30), todayISO())}
            className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
            style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            30 Days
          </button>
          <button
            onClick={() => apply(monthStartISO(), todayISO())}
            className="rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/5 transition-colors"
            style={{ color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            This Month
          </button>
        </div>

        <button
          onClick={exportCsv}
          disabled={!summary}
          className="ml-auto rounded-lg px-4 py-2 text-xs font-bold transition hover:brightness-110 disabled:opacity-40"
          style={{ backgroundColor: "#f0b100", color: "#000" }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
