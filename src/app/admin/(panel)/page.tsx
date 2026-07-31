"use client";

import StatCard from "@/components/admin/ui/StatCard";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import { useAdminQuery } from "@/lib/admin-query";
import { useAdmin } from "@/lib/admin-context";

interface DashboardStats {
  active_tables: number;
  online_players: number;
  today_rounds: number;
  active_operators: number;
}

export default function AdminDashboard() {
  /* The dashboard is the landing page and the one people bounce back to all
     shift, so it is the biggest single winner from the cache: returning to it
     paints the numbers immediately and refreshes them underneath, instead of
     showing "..." in every tile again. */
  const { data: stats, loading, refreshing } = useAdminQuery<DashboardStats>(
    "/api/admin/stats",
  );
  /* The stats route aggregates several endpoints and swallows the ones it is
     refused, so a role without `operators` would be shown a confident "0"
     rather than a denial. A number that is wrong is worse than a tile that
     isn't there. */
  const { canRead } = useAdmin();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <RefreshingHint show={refreshing && !loading} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Tables"
          value={loading ? "..." : stats?.active_tables ?? 0}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" /><path d="M9 21V9" />
            </svg>
          }
        />
        <StatCard
          label="Online Players"
          value={loading ? "..." : stats?.online_players ?? 0}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Today's Rounds"
          value={loading ? "..." : stats?.today_rounds ?? 0}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        {canRead("operators") && (
        <StatCard
          label="Active System Providers"
          value={loading ? "..." : stats?.active_operators ?? 0}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7h-9" /><path d="M14 17H5" />
              <circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
            </svg>
          }
        />
        )}
      </div>

      {/* Recent activity placeholder */}
      <div
        className="rounded-xl p-6 max-md:p-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "#d08700" }}
        >
          Recent Activity
        </h2>
        <p className="text-sm" style={{ color: "#6a7282" }}>
          Activity feed will be available in a future update.
        </p>
      </div>
    </div>
  );
}
