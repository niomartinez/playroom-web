"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import Pagination from "@/components/admin/ui/Pagination";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import UrlFilterBoundary from "@/components/admin/ui/UrlFilterBoundary";
import { SITE_HINT, type SiteOption } from "@/components/admin/SiteFilter";
import { useAdminQuery } from "@/lib/admin-query";
import { useUrlFilters } from "@/lib/use-url-filters";
import { BET_FILTER_KEYS, EMPTY_BET_FILTERS, betLogParams, type AdminBet, type BetLogFilters, type BetLogResponse } from "@/lib/admin-bets";

const STATUS_OPTIONS = ["pending", "accepted", "rejected", "settled", "voided", "rollback"];
const inputClass = "w-full min-h-11 rounded-lg border border-[#d0870026] bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-[#f0b100] max-md:text-base";
const money = (value: number | string | null) => value == null ? "—" : Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timestamp = (value: string) => new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila" });

const columns: Column<AdminBet>[] = [
  { key: "external_bet_id", label: "Bet ID", mobile: "title", render: (row) => <div className="min-w-36 max-w-72 break-all font-mono max-md:min-w-0 text-xs" title={`Internal ID: ${row.id}`}>{row.external_bet_id || row.id}</div> },
  { key: "created_at", label: "Placed", render: (row) => <span className="whitespace-nowrap">{timestamp(row.created_at)}</span> },
  { key: "site_label", label: "Site", render: (row) => <span title={SITE_HINT}>{row.site_label}{row.site_code ? ` (${row.site_code})` : ""}</span> },
  { key: "player_username", label: "Player", render: (row) => <div className="min-w-28 max-w-56 break-words max-md:min-w-0"><div>{row.player_username || row.player_external_id || "—"}</div>{row.player_display_name ? <div className="text-xs text-[#99a1af]">{row.player_display_name}</div> : null}</div> },
  { key: "external_fight_id", label: "Table / Round", render: (row) => <div><div>{row.game_name || row.external_game_id || "—"}</div>{row.fight_id ? <Link className="inline-flex min-h-11 items-center break-all text-xs text-[#f0b100] underline" href={`/admin/rounds/${row.fight_id}`}>{row.external_fight_id || row.fight_id}</Link> : "—"}</div> },
  { key: "bet_code", label: "Selection", render: (row) => row.bet_code || row.team },
  { key: "bet_amount", label: "Stake (PHP)", render: (row) => money(row.bet_amount) },
  { key: "odds", label: "Odds", render: (row) => row.odds == null ? "—" : String(row.odds) },
  { key: "payoff", label: "Payout (PHP)", render: (row) => money(row.payoff) },
  { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status === "settled" ? "active" : ["rejected", "voided", "rollback"].includes(row.status) ? "error" : "pending"} label={row.status} /> },
];

function BetLogPageInner() {
  const { values, setFilter, setValues } = useUrlFilters({ ...EMPTY_BET_FILTERS, page: "1", page_size: "20" });
  const page = Math.max(1, Math.floor(Number(values.page) || 1));
  const pageSize = [10, 20, 50, 100].includes(Number(values.page_size)) ? Number(values.page_size) : 20;
  const filters = Object.fromEntries(BET_FILTER_KEYS.map((key) => [key, values[key]])) as BetLogFilters;
  const params = betLogParams(filters);
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  const { data, loading, refreshing, error, refetch } = useAdminQuery<BetLogResponse>(`/api/admin/bets?${params}`);
  const { data: sites } = useAdminQuery<{ sites: SiteOption[] }>("/api/admin/sites");
  const { data: tables } = useAdminQuery<{ id: string; name: string }[]>("/api/admin/tables");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const roundLabel = data?.bets.find((bet) => bet.fight_id === filters.fight_id)?.external_fight_id || filters.fight_id;

  async function download(filtersToExport: BetLogFilters) {
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch(`/api/admin/bets/export?${betLogParams(filtersToExport)}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || (typeof body?.detail === "string" ? body.detail : "Export failed. Check your filters and try again."));
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "bet-log.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = Object.fromEntries(BET_FILTER_KEYS.map((key) => [key, String(form.get(key) || "").trim()])) as BetLogFilters;
    setFilter(next);
    setExportError(null);
    if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "export") void download(next);
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-white">Bet log</h1><p className="mt-1 text-sm text-[#99a1af]">Newest bets first. Dates and displayed times use Manila (UTC+8). Payout includes returned stake.</p></div>
    {filters.fight_id ? <div className="flex flex-wrap items-center gap-x-2 rounded-lg border border-[#d0870033] bg-[#171717] px-4 py-2 text-sm text-[#99a1af]">
      <span>Showing bets for round</span>
      <Link href={`/admin/rounds/${encodeURIComponent(filters.fight_id)}`} className="inline-flex min-h-11 items-center break-all font-mono text-[#f0b100] underline">{roundLabel}</Link>
    </div> : null}
    <form key={JSON.stringify(filters)} onSubmit={submit} className="rounded-xl border border-[#d0870033] bg-[#171717] p-4">
      <input type="hidden" name="fight_id" value={filters.fight_id} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs text-[#99a1af]">Exact bet ID<input name="bet_id" defaultValue={values.bet_id} maxLength={200} placeholder="External ID or internal UUID" className={`${inputClass} mt-1`} /></label>
        <label className="text-xs text-[#99a1af]">Player search<input name="player" defaultValue={values.player} maxLength={100} placeholder="Username, screen name or player ID" className={`${inputClass} mt-1`} /></label>
        <label className="text-xs text-[#99a1af]" title={SITE_HINT}>Site<select name="site" defaultValue={values.site} aria-label="Filter by site" className={`${inputClass} mt-1`}><option value="">All sites</option>{sites?.sites.map((site) => <option key={site.site_code ?? "unassigned"} value={site.site_code ?? "unassigned"}>{site.site_label}</option>)}</select></label>
        <label className="text-xs text-[#99a1af]">Table<select name="game_id" defaultValue={values.game_id} className={`${inputClass} mt-1`}><option value="">All tables</option>{tables?.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></label>
        <label className="text-xs text-[#99a1af]">Status<select name="status" defaultValue={values.status} className={`${inputClass} mt-1`}><option value="">All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label className="text-xs text-[#99a1af]">From (Manila)<input name="date_from" type="date" defaultValue={values.date_from} className={`${inputClass} mt-1`} /></label>
        <label className="text-xs text-[#99a1af]">To (Manila)<input name="date_to" type="date" defaultValue={values.date_to} className={`${inputClass} mt-1`} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 max-md:flex-col">
        <button type="submit" className="min-h-11 rounded-lg bg-[#f0b100] px-4 py-2 text-sm font-semibold text-black">Apply filters</button>
        <button type="submit" value="export" disabled={exporting} className="min-h-11 rounded-lg border border-[#d087004d] px-4 py-2 text-sm text-[#f0b100] disabled:opacity-50">{exporting ? "Exporting…" : "Export CSV"}</button>
        <button type="reset" onClick={() => { setFilter(EMPTY_BET_FILTERS); setExportError(null); }} className="min-h-11 rounded-lg px-4 py-2 text-sm text-[#99a1af] hover:text-white">Clear filters</button>
      </div>
      <p className="mt-3 text-xs text-[#99a1af]">Export applies these filters and includes all matching pages, up to 50,000 bets.</p>
    </form>
    {error || exportError ? <div role="alert" className="rounded-lg border border-red-500/30 p-4 text-sm text-red-300">{exportError || error}{error ? <button onClick={refetch} className="ml-3 min-h-11 underline">Retry</button> : null}</div> : null}
    <RefreshingHint show={refreshing && !loading} />
    <DataTable columns={columns} data={data?.bets ?? []} loading={loading} hideSearch disablePagination pageSize={pageSize} emptyMessage={error ? "Bet log could not be loaded" : "No bets match these filters"} />
    <Pagination page={page} totalPages={Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))} total={data?.total ?? 0} label="bets" pageSize={pageSize} onPage={(next) => setValues({ page: String(next) })} onPageSize={(size) => setFilter({ page_size: String(size) })} />
  </div>;
}

export default function BetLogPage() {
  return <UrlFilterBoundary><BetLogPageInner /></UrlFilterBoundary>;
}
