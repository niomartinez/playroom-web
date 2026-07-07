"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/admin/ui/StatCard";

interface Summary {
  total_wagered: number;
  total_payout: number;
  ggr: number;
  bet_count: number;
  date_from?: string;
  date_to?: string;
}

function fmt(n: number): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function OcmsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin-ocms/reports/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setSummary(json.data ?? json);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="text-sm -mt-4" style={{ color: "#6a7282" }}>
        Last 30 days
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Wagered"
          value={loading ? "..." : fmt(summary?.total_wagered ?? 0)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12" /><path d="M8 10h8" />
            </svg>
          }
        />
        <StatCard
          label="Total Payout"
          value={loading ? "..." : fmt(summary?.total_payout ?? 0)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="GGR"
          value={loading ? "..." : fmt(summary?.ggr ?? 0)}
          color={
            loading ? undefined : (summary?.ggr ?? 0) >= 0 ? "#00bc7d" : "#fb2c36"
          }
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          }
        />
        <StatCard
          label="Bet Count"
          value={loading ? "..." : (summary?.bet_count ?? 0).toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" /><path d="M9 21V9" />
            </svg>
          }
        />
      </div>

      {/* Report shortcut */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wider mb-2"
          style={{ color: "#d08700" }}
        >
          Reporting
        </h2>
        <p className="text-sm" style={{ color: "#6a7282" }}>
          Visit the Reports page for custom date ranges and monthly accounting.
        </p>
      </div>
    </div>
  );
}
