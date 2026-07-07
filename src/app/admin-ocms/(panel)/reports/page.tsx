import StatCard from "@/components/admin/ui/StatCard";
import OcmsReportsControls from "@/components/admin/OcmsReportsControls";
import { getReportSummary, getReportMonthly } from "@/lib/ocms-server";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function fmt(n: number): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default async function OcmsReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  // Validate the incoming date params — a malformed ?from/?to (e.g. "abc",
  // "2026-13-99") would otherwise make new Date().toISOString() throw and 500
  // the whole route (there is no error boundary in this segment).
  const validDay = (v: string | undefined): string | null =>
    v && !Number.isNaN(new Date(v + "T00:00:00").getTime()) ? v : null;
  const dateFrom = validDay(sp.from) ?? daysAgoISO(30);
  const dateTo = validDay(sp.to) ?? todayISO();

  // Translate the date-only range into an inclusive ISO datetime window.
  const fromIso = new Date(dateFrom + "T00:00:00").toISOString();
  const toIso = new Date(dateTo + "T23:59:59").toISOString();

  const [summary, monthly] = await Promise.all([
    getReportSummary(fromIso, toIso),
    getReportMonthly(12),
  ]);

  const totalWagered = monthly.reduce((s, r) => s + r.total_wagered, 0);
  const totalPayout = monthly.reduce((s, r) => s + r.total_payout, 0);
  const totalGgr = monthly.reduce((s, r) => s + r.ggr, 0);
  const totalBets = monthly.reduce((s, r) => s + r.bet_count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>

      {/* Date range picker + CSV export (interactive) */}
      <OcmsReportsControls
        dateFrom={dateFrom}
        dateTo={dateTo}
        summary={summary}
        monthly={monthly}
      />

      {/* Summary cards */}
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
                    {fmt(totalWagered)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                    {fmt(totalPayout)}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono font-bold"
                    style={{ color: totalGgr >= 0 ? "#00bc7d" : "#fb2c36" }}
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
        )}
      </div>
    </div>
  );
}
