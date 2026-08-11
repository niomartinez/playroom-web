"use client";

import StatCard from "@/components/admin/ui/StatCard";
import MobileCardList, {
  type MobileCardItem,
} from "@/components/admin/ui/MobileCardList";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import UrlFilterBoundary from "@/components/admin/ui/UrlFilterBoundary";
import { useAdminQuery } from "@/lib/admin-query";
import { useUrlFilters } from "@/lib/use-url-filters";
import SiteFilter, { SITE_HINT } from "@/components/admin/SiteFilter";

interface Summary {
  total_wagered: number;
  total_payout: number;
  ggr: number;
  bet_count: number;
  round_count: number;
  unique_players: number;
  new_players: number;
  returning_players: number;
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
  unique_players?: number;
}

/* The breakdown endpoints wrap their rows so they can also report whether the
   aggregation hit its row cap. Per-group unique-player counts are derived from
   those same paged rows, so a truncated response means the headcounts are low
   too — worth saying out loud rather than rendering as fact. */
interface BreakdownResponse {
  operators?: BreakdownEntry[];
  tables?: BreakdownEntry[];
  truncated?: boolean;
}

/* The site breakdown carries three figures the other two cannot: hold, spend
   per ACTIVE player, and how much of a site's registered base actually plays.
   Every one of them can be unanswerable (a dormant site divides by zero), so
   they are nullable rather than silently zero — 0% reads as "performing
   badly", which is a different claim from "nothing to measure". */
interface SiteEntry {
  site_code: string | null;
  site_label: string;
  bet_count: number;
  unique_players: number;
  registered_players: number | null;
  total_wagered: number;
  total_payout: number;
  ggr: number;
  hold_pct: number | null;
  wagered_per_player: number | null;
  active_ratio: number | null;
}

/* No `truncated` key: by-site aggregates in SQL and has no row cap, unlike
   by-operator and by-table which page 10,000 rows into Python. */
interface SiteBreakdownResponse {
  sites?: SiteEntry[];
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
    site: "",
  });
  const dateFrom = values.date_from;
  const dateTo = values.date_to;
  const activeTab: "operator" | "table" | "site" =
    values.tab === "table" ? "table" : values.tab === "site" ? "site" : "operator";

  const params = new URLSearchParams();
  // Send the bare date and let the backend resolve the day in Manila time.
  // This used to convert to the BROWSER's local midnight, which meant the same
  // picked date produced different rows for an admin in a different timezone,
  // and UTC days (an 8-hour shift) for any server-side or scheduled caller.
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  /* Scopes the summary tiles and the By Table tab — this is what makes "GSP's
     numbers on Table 1" answerable. By Site deliberately ignores it: a per-site
     breakdown filtered to one site is a one-row table. */
  if (values.site) params.set("site", values.site);
  const qs = params.toString();

  // Three independent cache keys rather than one combined fetch: switching the
  // operator/table tab needs no request at all (both breakdowns are already
  // cached for this period), and a slow aggregation no longer holds up the two
  // that finished.
  const summaryQ = useAdminQuery<Summary>(`/api/admin/reports/summary?${qs}`);
  const operatorQ = useAdminQuery<BreakdownResponse>(`/api/admin/reports/by-operator?${qs}`);
  const tableQ = useAdminQuery<BreakdownResponse>(`/api/admin/reports/by-table?${qs}`);
  /* Date range only — see the `site` comment above. */
  /* The first day that has any settled bet, for the All time preset. An empty
     date_from cannot mean "everything" — every report defaults an absent
     date_from to the last 30 days — so the preset resolves a real date and the
     URL stays a shareable, honest range. */
  const rangeQ = useAdminQuery<{ first_date: string | null; last_date: string | null }>(
    "/api/admin/reports/data-range",
  );
  const firstDataDate = rangeQ.data?.first_date ?? null;

  const siteQ = useAdminQuery<SiteBreakdownResponse>(
    `/api/admin/reports/by-site?${dateFrom ? `date_from=${dateFrom}&` : ""}${dateTo ? `date_to=${dateTo}` : ""}`,
  );

  // Mock-site labelling. Only a viewer who sees mock AND has labelling on gets a
  // tag; for everyone else these rows are already filtered out server-side, so
  // this is purely cosmetic and safe to query for all callers.
  const mockViewQ = useAdminQuery<{ labeled: boolean; mock_site_codes: string[] }>(
    "/api/admin/mock/view-state",
  );
  const mockLabeled = Boolean(mockViewQ.data?.labeled);
  const mockCodes = mockViewQ.data?.mock_site_codes ?? [];
  const siteLabel = (code: string | null, label: string) =>
    mockLabeled && code && mockCodes.includes(code) ? `${label} · mock` : label;

  const summary = summaryQ.data ?? null;
  const byOperator = operatorQ.data?.operators ?? [];
  const byTable = tableQ.data?.tables ?? [];
  const bySite = siteQ.data?.sites ?? [];
  const truncated =
    Boolean(operatorQ.data?.truncated) || Boolean(tableQ.data?.truncated);
  const loading =
    summaryQ.loading || operatorQ.loading || tableQ.loading || siteQ.loading;
  const refreshing =
    summaryQ.refreshing ||
    operatorQ.refreshing ||
    tableQ.refreshing ||
    siteQ.refreshing;

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
      [
        "Total Wagered", "Total Payout", "GGR", "Bets", "Rounds",
        "Unique Players", "New Players", "Returning Players",
      ],
      summary
        ? [
            summary.total_wagered, summary.total_payout, summary.ggr,
            summary.bet_count, summary.round_count,
            summary.unique_players ?? 0, summary.new_players ?? 0,
            summary.returning_players ?? 0,
          ]
        : ["-", "-", "-", "-", "-", "-", "-", "-"],
      [],
      ["By System Provider"],
      ["System Provider", "Wagered", "Payout", "GGR", "Bets", "Players"],
      ...byOperator.map((r) => [r.operator_name || "Unknown", r.total_wagered, r.total_payout, r.ggr, r.bet_count, r.unique_players ?? 0]),
      [],
      ["By Table"],
      ["Table", "Wagered", "Payout", "GGR", "Bets", "Players"],
      ...byTable.map((r) => [r.table_name || "Unknown", r.total_wagered, r.total_payout, r.ggr, r.bet_count, r.unique_players ?? 0]),
      [],
      ["By Site"],
      ["Site is derived from the first 3 characters of the player's username (the OCMS site prefix)"],
      ["Hold % is the PERIOD ACTUAL, not an expected rate"],
      [
        "Site", "Wagered", "Payout", "GGR", "Hold %", "Bets",
        "Active Players", "Registered Players", "Wagered/Active Player",
      ],
      ...bySite.map((r) => [
        siteLabel(r.site_code, r.site_label), r.total_wagered, r.total_payout, r.ggr,
        r.hold_pct ?? "-", r.bet_count, r.unique_players,
        r.registered_players ?? "-", r.wagered_per_player ?? "-",
      ]),
    ];
    downloadCsv(`ggr-report_${dateFrom}_${dateTo}.csv`, rows);
  }

  /* Site rows are projected into the shared breakdown shape so the table, the
     mobile cards and the totals row all keep working unchanged. The three
     site-only figures ride along on `extra` and render as extra columns. */
  const breakdownData: (BreakdownEntry & { extra?: SiteEntry })[] =
    activeTab === "operator"
      ? byOperator
      : activeTab === "table"
        ? byTable
        : bySite.map((r) => ({
            operator_name: siteLabel(r.site_code, r.site_label),
            table_name: siteLabel(r.site_code, r.site_label),
            total_wagered: r.total_wagered,
            total_payout: r.total_payout,
            ggr: r.ggr,
            bet_count: r.bet_count,
            unique_players: r.unique_players,
            extra: r,
          }));

  const pct = (v: number | null, digits = 2) =>
    v === null ? "\u2014" : `${v.toFixed(digits)}%`;

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
      const name =
        activeTab === "operator" ? row.operator_name : row.table_name;
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
          {
            label: "Players",
            value: (
              <span className="font-mono" style={{ color: "#99a1af" }}>
                {(row.unique_players ?? 0).toLocaleString()}
              </span>
            ),
          },
          /* The site-only figures. Dropped entirely on the other two tabs
             rather than shown empty — a card of dashes reads as missing data
             rather than as a column that does not apply here. */
          ...(activeTab === "site" && row.extra
            ? [
                {
                  label: "Hold % (actual)",
                  value: (
                    <span className="font-mono" style={{ color: "#99a1af" }}>
                      {pct(row.extra.hold_pct)}
                    </span>
                  ),
                },
                {
                  label: "Active / Registered",
                  value: (
                    <span className="font-mono" style={{ color: "#99a1af" }}>
                      {row.extra.active_ratio == null
                        ? "\u2014"
                        : `${(row.extra.active_ratio * 100).toFixed(1)}% of ${
                            row.extra.registered_players ?? "?"
                          }`}
                    </span>
                  ),
                },
                {
                  label: "Wagered / Player",
                  value: (
                    <span className="font-mono" style={{ color: "#99a1af" }}>
                      {row.extra.wagered_per_player == null
                        ? "\u2014"
                        : fmt(row.extra.wagered_per_player)}
                    </span>
                  ),
                },
              ]
            : []),
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
        {
          /* Deliberately NOT the sum of the column above: one person playing
             two tables is one player, and adding the per-group counts would
             double-count them. This is the de-duplicated figure. */
          label: "Players",
          value: (
            <span className="font-mono" style={{ color: "#99a1af" }}>
              {(summary?.unique_players ?? 0).toLocaleString()}
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
              /* Chrome only opens the native calendar from the tiny icon, so
                 clicking the field looked broken. showPicker() opens it from
                 anywhere in the control; the optional call keeps browsers that
                 lack it on their default behaviour rather than throwing. */
              onClick={(e) => e.currentTarget.showPicker?.()}
              onFocus={(e) => e.currentTarget.showPicker?.()}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer max-md:w-full max-md:min-h-[44px]"
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
              onClick={(e) => e.currentTarget.showPicker?.()}
              onFocus={(e) => e.currentTarget.showPicker?.()}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer max-md:w-full max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>

          <div className="max-md:flex-1 max-md:min-w-[9rem]">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
              title={SITE_HINT}
            >
              Site
            </label>
            <SiteFilter
              value={values.site}
              onChange={(site) => setValues({ site })}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]"
              style={inputStyle}
            />
          </div>

          {/* Preset buttons.

              The active preset is highlighted: with five of them and a pair of
              date fields, "which range am I looking at" was otherwise only
              answerable by reading the two dates and doing the arithmetic. */}
          <div className="flex gap-2 max-md:grid max-md:w-full max-md:grid-cols-2">
            {[
              { label: "Today", from: todayISO(), to: todayISO() },
              { label: "7 Days", from: daysAgoISO(7), to: todayISO() },
              { label: "30 Days", from: daysAgoISO(30), to: todayISO() },
              { label: "This Month", from: monthStartISO(), to: todayISO() },
              /* Only offered once we know the first day that has data — a
                 preset that resolved to an empty range would be worse than no
                 preset. */
              ...(firstDataDate
                ? [{ label: "All Time", from: firstDataDate, to: todayISO() }]
                : []),
            ].map((p) => {
              const active = dateFrom === p.from && dateTo === p.to;
              return (
                <button
                  key={p.label}
                  onClick={() => setRange(p.from, p.to)}
                  aria-pressed={active}
                  title={
                    p.label === "All Time"
                      ? `Everything since the first settled bet (${p.from})`
                      : undefined
                  }
                  className="rounded-lg px-3 py-2 text-xs font-medium transition-colors max-md:min-h-[44px]"
                  style={
                    active
                      ? {
                          color: "#f0b100",
                          border: "1px solid rgba(240,177,0,0.5)",
                          backgroundColor: "rgba(240,177,0,0.1)",
                        }
                      : { color: "#99a1af", border: "1px solid rgba(255,255,255,0.1)" }
                  }
                >
                  {p.label}
                </button>
              );
            })}
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
          {/* Six across only once there is genuinely room for six. At sm the
              cards were ~90px wide and a peso total could not fit at any
              legible size, so it overflowed the border rather than wrapped. */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Total Wagered" value={fmt(summary.total_wagered)} />
            <StatCard label="Total Payout" value={fmt(summary.total_payout)} />
            <StatCard
              label="GGR"
              value={fmt(summary.ggr)}
              color={summary.ggr >= 0 ? "#00bc7d" : "#fb2c36"}
            />
            <StatCard label="Bets" value={summary.bet_count.toLocaleString()} />
            <StatCard label="Rounds" value={summary.round_count.toLocaleString()} />
            <StatCard
              label="Players"
              value={(summary.unique_players ?? 0).toLocaleString()}
              hint={`${summary.new_players ?? 0} new · ${
                summary.returning_players ?? 0
              } returning`}
            />
          </div>

          {truncated && (
            <p
              className="text-xs rounded-lg px-3 py-2"
              style={{
                color: "#d08700",
                border: "1px solid rgba(208,135,0,0.3)",
                backgroundColor: "rgba(208,135,0,0.06)",
              }}
            >
              This period has more bets than the breakdown aggregates in one
              pass. The per-row Wagered / Payout / GGR / Bets / Players figures
              below are partial — narrow the date range for exact numbers. The
              summary tiles above are unaffected.
            </p>
          )}

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
              {(["operator", "table", "site"] as const).map((tab) => (
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
                  By{" "}
                  {tab === "operator"
                    ? "System Provider"
                    : tab === "table"
                      ? "Table"
                      : "Site"}
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
                        {activeTab === "operator"
                          ? "System Provider"
                          : activeTab === "table"
                            ? "Table"
                            : "Site"}
                      </th>
                      {["Wagered", "Payout", "GGR", "Bets", "Players"].map((h) => (
                        <th
                          key={h}
                          className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                          style={{ color: "#d08700" }}
                        >
                          {h}
                        </th>
                      ))}
                      {activeTab === "site" && (
                        <>
                          {/* Period ACTUAL, not an expected rate. At current
                              volumes this runs well above baccarat's
                              theoretical 1-2% of turnover — variance and
                              side-bet mix on a few thousand bets. Unlabelled,
                              someone forecasts on it. */}
                          <th
                            className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                            style={{ color: "#d08700" }}
                            title="Period actual (GGR / wagered) — not an expected rate"
                          >
                            Hold %
                          </th>
                          <th
                            className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                            style={{ color: "#d08700" }}
                            title="Players who bet this period, over players ever registered to this site"
                          >
                            Active / Reg
                          </th>
                          <th
                            className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                            style={{ color: "#d08700" }}
                            title="Wagered divided by ACTIVE players, not registered ones"
                          >
                            Wagered / Player
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownData.map((row, i) => {
                      const name =
                        activeTab === "operator"
                          ? row.operator_name
                          : row.table_name;
                      /* A site with players but no bets in the window is listed
                         idle rather than omitted — an absent row cannot be told
                         apart from a site that does not exist. Dimmed so it
                         reads as quiet rather than as data. */
                      const idle = activeTab === "site" && row.bet_count === 0;
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            opacity: idle ? 0.5 : 1,
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
                          <td
                            className="px-4 py-3 text-right font-mono"
                            style={{ color: "#99a1af" }}
                          >
                            {(row.unique_players ?? 0).toLocaleString()}
                          </td>
                          {activeTab === "site" && (
                            <>
                              <td
                                className="px-4 py-3 text-right font-mono"
                                style={{ color: "#99a1af" }}
                              >
                                {pct(row.extra?.hold_pct ?? null)}
                              </td>
                              <td
                                className="px-4 py-3 text-right font-mono"
                                style={{ color: "#99a1af" }}
                              >
                                {row.extra?.active_ratio == null
                                  ? "\u2014"
                                  : `${(row.extra.active_ratio * 100).toFixed(1)}% of ${
                                      row.extra.registered_players ?? "?"
                                    }`}
                              </td>
                              <td
                                className="px-4 py-3 text-right font-mono"
                                style={{ color: "#99a1af" }}
                              >
                                {row.extra?.wagered_per_player == null
                                  ? "\u2014"
                                  : fmt(row.extra.wagered_per_player)}
                              </td>
                            </>
                          )}
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
                      <td
                        className="px-4 py-3 text-right font-mono font-semibold"
                        style={{ color: "#99a1af" }}
                      >
                        {/* De-duplicated across groups, not a column sum —
                            one person on two tables is one player. */}
                        {(summary.unique_players ?? 0).toLocaleString()}
                      </td>
                      {/* Deliberately blank: a hold rate, an activity ratio and
                          a per-player average are not column sums, and a
                          plausible-looking total here would be a made-up
                          number. */}
                      {activeTab === "site" && (
                        <>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3" />
                        </>
                      )}
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
