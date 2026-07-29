import Link from "next/link";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import LinkSpinner from "@/components/admin/ui/LinkSpinner";
import MobileCardList from "@/components/admin/ui/MobileCardList";
import OcmsPlayersSearch from "@/components/admin/OcmsPlayersSearch";
import PaginationLinks from "@/components/admin/ui/PaginationLinks";
import SortHeaderLink from "@/components/admin/ui/SortHeaderLink";
import type { SortDir } from "@/components/admin/ui/SortHeader";
import { getPlayers } from "@/lib/ocms-server";

const PAGE_SIZE = 20;

/* The same five sortable columns as the desktop header row. Below `md` there
   is no header row to click, so they are re-offered as tappable chips that
   navigate to exactly the same URL — the sort keeps happening in the database
   rather than degrading to a reorder of the twenty rows on screen. */
const SORT_CHIPS: { key: string; label: string; defaultDir: SortDir }[] = [
  { key: "username", label: "Username", defaultDir: "asc" },
  { key: "external_user_id", label: "External ID", defaultDir: "asc" },
  { key: "balance", label: "Balance", defaultDir: "desc" },
  { key: "is_active", label: "Status", defaultDir: "desc" },
  { key: "created_at", label: "Joined", defaultDir: "desc" },
];

export default async function OcmsPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    is_active?: string;
    balance_min?: string;
    balance_max?: string;
    sort_by?: string;
    sort_dir?: string;
  }>;
}) {
  const sp = await searchParams;
  const search = sp.search ?? "";
  const isActive = sp.is_active ?? "";
  const balanceMin = sp.balance_min ?? "";
  const balanceMax = sp.balance_max ?? "";
  const sortBy = sp.sort_by ?? "created_at";
  const sortDir: SortDir = sp.sort_dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(sp.page) || 1);

  const { players, total } = await getPlayers({
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    is_active: isActive,
    balance_min: balanceMin,
    balance_max: balanceMax,
    sort_by: sortBy,
    sort_dir: sortDir,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* One href builder for every control, so paging never drops the filters and
     sorting never drops the page size or the search. Anything at its default is
     omitted, which keeps a pristine URL clean. */
  function hrefWith(over: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    const merged: Record<string, string> = {
      search,
      is_active: isActive,
      balance_min: balanceMin,
      balance_max: balanceMax,
      sort_by: sortBy,
      sort_dir: sortDir,
      page: String(page),
      ...Object.fromEntries(
        Object.entries(over).map(([k, v]) => [k, v === undefined ? "" : String(v)]),
      ),
    };
    const DEFAULTS: Record<string, string> = {
      sort_by: "created_at",
      sort_dir: "desc",
      page: "1",
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== DEFAULTS[k]) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/admin-ocms/players?${qs}` : "/admin-ocms/players";
  }

  // Changing a sort or a filter returns to page 1 — a filtered page 7 is
  // usually empty, and landing there looks like "no results".
  const sortHref = (next: { sort_by: string; sort_dir: SortDir }) =>
    hrefWith({ ...next, page: 1 });
  const pageHref = (p: number) => hrefWith({ page: p });

  const sortCol = (key: string, label: string, defaultDir: SortDir = "desc") => (
    <SortHeaderLink
      label={label}
      sortKey={key}
      activeKey={sortBy}
      activeDir={sortDir}
      defaultDir={defaultDir}
      hrefFor={sortHref}
    />
  );

  // Same rule the header link uses: re-clicking the active column flips it,
  // a new column starts at the direction most useful for its type.
  const nextDirFor = (key: string, defaultDir: SortDir): SortDir =>
    key === sortBy ? (sortDir === "asc" ? "desc" : "asc") : defaultDir;

  const cardItems = players.map((p) => ({
    id: p.id,
    title: p.username,
    href: `/admin-ocms/players/${p.id}`,
    actionLabel: p.username,
    rows: [
      {
        label: "External ID",
        value: (
          <span className="font-mono" style={{ color: "#99a1af" }}>
            {p.external_user_id}
          </span>
        ),
      },
      {
        label: "Balance",
        value: (
          <span className="font-mono">
            {Number(p.balance).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}{" "}
            <span style={{ color: "#6a7282" }}>{p.currency_code}</span>
          </span>
        ),
      },
      {
        label: "Status",
        value: <StatusBadge status={p.is_active ? "active" : "inactive"} />,
      },
      {
        label: "Joined",
        value: p.created_at
          ? new Date(p.created_at).toLocaleDateString()
          : "—",
      },
    ],
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Players</h1>

      {/* Filter bar (search only — single operator, read-only) */}
      <OcmsPlayersSearch
        initialSearch={search}
        initialActive={isActive}
        initialBalanceMin={balanceMin}
        initialBalanceMax={balanceMax}
      />

      {/* Results table (server-rendered) */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        {/* Sort chips (below md) — the header row is a desktop-only affordance. */}
        <div
          className="flex items-center gap-2 px-4 py-2 md:hidden"
          style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}
        >
          <span
            className="shrink-0 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "#6a7282" }}
          >
            Sort
          </span>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="flex w-max gap-2">
              {SORT_CHIPS.map((c) => {
                const active = sortBy === c.key;
                return (
                  <Link
                    key={c.key}
                    href={sortHref({
                      sort_by: c.key,
                      sort_dir: nextDirFor(c.key, c.defaultDir),
                    })}
                    className="inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-lg px-3 text-xs font-semibold uppercase tracking-wider"
                    style={{
                      color: active ? "#0a0a0a" : "#99a1af",
                      backgroundColor: active ? "#f0b100" : "transparent",
                      border: active ? "none" : "1px solid rgba(255,255,255,0.08)",
                    }}
                    aria-label={
                      active
                        ? `${c.label}, sorted ${sortDir === "asc" ? "ascending" : "descending"}. Activate to reverse.`
                        : `${c.label}, not sorted. Activate to sort.`
                    }
                  >
                    {c.label}
                    <span aria-hidden style={{ fontSize: 9, opacity: active ? 1 : 0.35 }}>
                      {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cards (below md) — the five-column grid squashes on a phone. */}
        <div className="p-4 md:hidden">
          <MobileCardList items={cardItems} emptyMessage="No players found" />
        </div>

        {/* Header row */}
        <div
          className="grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.9fr] px-4 py-3 text-xs font-semibold uppercase tracking-wider max-md:hidden"
          style={{
            color: "#d08700",
            borderBottom: "1px solid rgba(208,135,0,0.15)",
          }}
        >
          <span>{sortCol("username", "Username", "asc")}</span>
          <span>{sortCol("external_user_id", "External ID", "asc")}</span>
          <span>{sortCol("balance", "Balance")}</span>
          <span>{sortCol("is_active", "Status")}</span>
          <span>{sortCol("created_at", "Joined")}</span>
        </div>

        <div className="max-md:hidden">
          {players.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm" style={{ color: "#6a7282" }}>
              No players found
            </div>
          ) : (
            players.map((p) => (
              <Link
                key={p.id}
                href={`/admin-ocms/players/${p.id}`}
                className="grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.9fr] items-center px-4 py-3 text-sm transition-colors hover:bg-white/5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <span className="text-white font-medium flex items-center gap-2">
                  {p.username}
                  <LinkSpinner />
                </span>
                <span className="font-mono text-xs" style={{ color: "#99a1af" }}>
                  {p.external_user_id}
                </span>
                <span className="font-mono text-white">
                  {Number(p.balance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}{" "}
                  <span style={{ color: "#6a7282" }}>{p.currency_code}</span>
                </span>
                <span>
                  <StatusBadge status={p.is_active ? "active" : "inactive"} />
                </span>
                <span style={{ color: "#99a1af" }}>
                  {p.created_at
                    ? new Date(p.created_at).toLocaleDateString()
                    : "—"}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      <PaginationLinks
        page={page}
        totalPages={totalPages}
        total={total}
        label="players"
        pageSize={PAGE_SIZE}
        hrefFor={pageHref}
      />

    </div>
  );
}
