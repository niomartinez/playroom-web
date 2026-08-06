"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { useDebounce } from "@/lib/use-debounce";
import { useAdminQuery } from "@/lib/admin-query";
import Pagination from "@/components/admin/ui/Pagination";
import SortHeader, { type SortDir } from "@/components/admin/ui/SortHeader";
import { useUrlFilters } from "@/lib/use-url-filters";

interface Player {
  id: string;
  external_user_id: string;
  username: string;
  balance: number;
  currency_code: string;
  is_active: boolean;
  is_test: boolean;
  /* Live presence, from the same 150s stream_sessions window the dashboard's
     Online Players tile counts — NOT the is_active account flag. */
  is_online: boolean;
  online_table: string | null;
  operator_id: string;
  operator_name: string;
  created_at: string;
  [key: string]: unknown;
}

interface OperatorOption {
  id: string;
  name: string;
}

function PlayersPageInner() {
  const router = useRouter();

  /* Filters live in the URL, so Back restores the exact view and re-selecting a
     previous filter rebuilds a request URL that is already in the query cache —
     which is what makes it repaint with no request and no spinner. */
  const { values, setValues, setFilter } = useUrlFilters({
    page: "1",
    page_size: "20",
    operator_id: "",
    search: "",
    is_active: "",
    playing_now: "",
    balance_min: "",
    balance_max: "",
    include_test: "",
    sort_by: "created_at",
    sort_dir: "desc",
  });
  const page = Math.max(1, Number(values.page) || 1);
  const pageSize = Number(values.page_size) || 20;
  const sortDir: SortDir = values.sort_dir === "asc" ? "asc" : "desc";

  // The search box is typed into, so it needs local state; the URL is updated
  // only once typing settles, or every keystroke would be a router.replace.
  const [searchInput, setSearchInput] = useState(values.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  useEffect(() => {
    if (debouncedSearch !== values.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, values.search, setFilter]);

  /* The balance bounds are typed into too, so they debounce for the same reason
     the search does — otherwise "100000" would fire six requests and create six
     cache entries on the way to the one that was meant. */
  const [balanceMin, setBalanceMin] = useState(values.balance_min);
  const [balanceMax, setBalanceMax] = useState(values.balance_max);
  const debouncedMin = useDebounce(balanceMin, 400);
  const debouncedMax = useDebounce(balanceMax, 400);
  useEffect(() => {
    if (debouncedMin !== values.balance_min) setFilter({ balance_min: debouncedMin });
  }, [debouncedMin, values.balance_min, setFilter]);
  useEffect(() => {
    if (debouncedMax !== values.balance_max) setFilter({ balance_max: debouncedMax });
  }, [debouncedMax, values.balance_max, setFilter]);

  const hasFilters =
    !!values.operator_id ||
    !!values.search ||
    !!values.is_active ||
    values.playing_now === "true" ||
    values.balance_min !== "" ||
    values.balance_max !== "" ||
    values.include_test === "true";

  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: values.sort_by,
    sort_dir: sortDir,
  });
  if (values.operator_id) query.set("operator_id", values.operator_id);
  if (values.search) query.set("search", values.search);
  if (values.is_active) query.set("is_active", values.is_active);
  if (values.playing_now === "true") query.set("playing_now", "true");
  // Blank means "no bound" — an empty string would be parsed as 0 and silently
  // filter out every player with no balance.
  if (values.balance_min !== "") query.set("balance_min", values.balance_min);
  if (values.balance_max !== "") query.set("balance_max", values.balance_max);
  /* Internal QA accounts (uitest-*, one per generated test link) are hidden by
     the BACKEND unless asked for, so the param is only ever sent to opt back
     IN — sending include_test=false would just be the default spelled out and
     would fragment the query cache for no gain. */
  if (values.include_test === "true") query.set("include_test", "true");

  const {
    data: playersData,
    loading,
    refreshing,
  } = useAdminQuery<{
    players: Player[];
    total: number;
    online_total: number;
  }>(`/api/admin/players?${query.toString()}`);
  const players = playersData?.players ?? [];
  const total = playersData?.total ?? 0;
  const onlineTotal = playersData?.online_total ?? 0;

  // The operator list barely changes and is shared with other pages, so it is
  // cached under its own key and costs nothing after the first visit anywhere.
  const { data: operatorsData } = useAdminQuery<OperatorOption[]>(
    "/api/admin/operators",
  );
  const operators = operatorsData ?? [];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const sortProps = (key: string, defaultDir: SortDir = "desc") => ({
    sortKey: key,
    activeKey: values.sort_by,
    activeDir: sortDir,
    defaultDir,
    onSort: setFilter,
  });

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.15)" as const,
  };

  /* Below md every control goes full width and grows to a 44px touch target.
     Above md nothing here applies, so the bar is byte-identical on desktop. */
  const controlClass =
    "rounded-lg px-3 py-2 text-sm text-white outline-none max-md:w-full max-md:min-h-[44px]";

  /* Headers sort on the SERVER (see SortHeader). DataTable's own `sortable`
     would reorder only the twenty rows on screen, which answers a different
     question than the header implies.

     `mobile` decides what survives below md, where a row becomes a card: the
     username identifies it, and the four fields an operator actually acts on
     (who they are, whose brand, how much, whether they can play) follow. Joined
     is the one column nobody opens a phone to check \u2014 it stays on the detail
     page, and it is still sortable from the card-mode sort control. */
  const columns: Column<Player>[] = [
    {
      key: "username",
      label: "Username",
      header: <SortHeader label="Username" {...sortProps("username", "asc")} />,
      mobile: "title",
      /* Only reachable with the test filter switched on, and then it is the
         thing you need to see: these rows carry play money on the real tables,
         so an unlabelled one reads as a customer. */
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          {row.username}
          {row.is_test && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
              style={{
                backgroundColor: "rgba(208,135,0,0.15)",
                color: "#f0b100",
                border: "1px solid rgba(240,177,0,0.35)",
              }}
            >
              TEST
            </span>
          )}
        </span>
      ),
    },
    {
      key: "external_user_id",
      label: "External ID",
      header: (
        <SortHeader label="External ID" {...sortProps("external_user_id", "asc")} />
      ),
      mobile: "row",
      render: (row) => (
        <span className="font-mono text-xs">{row.external_user_id}</span>
      ),
    },
    {
      key: "operator_name",
      label: "System Provider",
      mobile: "row",
      mobileLabel: "Provider",
      render: (row) => (
        <span>{row.operator_name || "\u2014"}</span>
      ),
    },
    {
      key: "balance",
      label: "Balance",
      header: <SortHeader label="Balance" {...sortProps("balance")} />,
      mobile: "row",
      render: (row) => (
        <span className="font-mono">
          {Number(row.balance).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}{" "}
          <span style={{ color: "#6a7282" }}>{row.currency_code}</span>
        </span>
      ),
    },
    {
      /* Not sortable: presence is computed live per request, not a column
         Postgres can order by — a header that promised otherwise would sort
         the twenty rows on screen and call it the answer. */
      key: "is_online",
      label: "Now",
      mobile: "row",
      mobileLabel: "Playing now",
      render: (row) =>
        row.is_online ? (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#05df72" }}>
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, backgroundColor: "#05df72" }}
            />
            {row.online_table || "At a table"}
          </span>
        ) : (
          <span style={{ color: "#6a7282" }}>—</span>
        ),
    },
    {
      key: "is_active",
      label: "Account",
      header: <SortHeader label="Account" {...sortProps("is_active")} />,
      mobile: "row",
      render: (row) => (
        <StatusBadge
          status={row.is_active ? "active" : "inactive"}
          label={row.is_active ? "Enabled" : "Disabled"}
        />
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      header: <SortHeader label="Joined" {...sortProps("created_at")} />,
      mobile: "hide",
      render: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleDateString()
          : "\u2014",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Players</h1>
        {/* The dashboard's Online Players figure, repeated here against the same
            presence read, so "3 online" and this list can be reconciled instead
            of looking like two different systems. Clicking it filters. */}
        <button
          onClick={() =>
            setFilter({ playing_now: values.playing_now === "true" ? "" : "true" })
          }
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor:
              values.playing_now === "true" ? "rgba(5,223,114,0.22)" : "rgba(5,223,114,0.12)",
            color: "#05df72",
            border:
              values.playing_now === "true"
                ? "1px solid rgba(5,223,114,0.5)"
                : "1px solid transparent",
          }}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, backgroundColor: "#05df72" }}
          />
          {onlineTotal} playing now
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div className="flex flex-wrap gap-3 items-end max-md:flex-col max-md:items-stretch">
          <div className="max-md:w-full">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Operator
            </label>
            <select
              value={values.operator_id}
              onChange={(e) => setFilter({ operator_id: e.target.value })}
              className={controlClass}
              style={inputStyle}
            >
              <option value="">All System Providers</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>
          </div>
          <div className="max-md:w-full">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Search
            </label>
            {/* The 220px floor is what a two-word search needs on desktop and
                what blows the row out on a 390px phone, so it is dropped there. */}
            <input
              type="text"
              placeholder="Username or external ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`${controlClass} min-w-[220px] max-md:min-w-0`}
              style={inputStyle}
            />
          </div>

          {/* Two different questions, two controls. "Active" used to be the
              only one here and it is the ACCOUNT flag — whether the person may
              play at all — so it read as "playing now" and answered with every
              dormant zero-balance account we have ever created. */}
          <div className="max-md:w-full">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Account
            </label>
            <select
              value={values.is_active}
              onChange={(e) => setFilter({ is_active: e.target.value })}
              className={controlClass}
              style={inputStyle}
            >
              <option value="">Any</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div className="max-md:w-full">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Presence
            </label>
            <select
              value={values.playing_now}
              onChange={(e) => setFilter({ playing_now: e.target.value })}
              className={controlClass}
              style={inputStyle}
            >
              <option value="">Any</option>
              <option value="true">At a table now</option>
            </select>
          </div>

          {/* Test accounts. Hidden by default because they are ours, not the
              operator's: every generated test link mints its own uitest-*
              player, so on a quiet week they are most of what "Joined" sorts to
              the top. QA still needs to find the one they just minted, hence a
              switch rather than a permanent exclusion. */}
          <div className="max-md:w-full">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Test accounts
            </label>
            <select
              value={values.include_test}
              onChange={(e) => setFilter({ include_test: e.target.value })}
              className={controlClass}
              style={inputStyle}
            >
              <option value="">Hidden</option>
              <option value="true">Shown</option>
            </select>
          </div>

          {/* Balance range. Two bounds rather than a preset list because the
              useful question changes constantly — "who is over 100k", "who is
              sitting at zero" — and a dropdown of guesses would never have the
              one being asked today. Either bound may be left blank. */}
          <div className="max-md:w-full">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#99a1af" }}
            >
              Balance
            </label>
            {/* The pair stays side by side on a phone: two bounds read as one
                range, and each half of a 390px row is still a wide field. */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Min"
                value={balanceMin}
                onChange={(e) => setBalanceMin(e.target.value)}
                className={`${controlClass} w-[100px] max-md:flex-1 max-md:min-w-0`}
                style={inputStyle}
              />
              <span style={{ color: "#6a7282" }}>–</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Max"
                value={balanceMax}
                onChange={(e) => setBalanceMax(e.target.value)}
                className={`${controlClass} w-[100px] max-md:flex-1 max-md:min-w-0`}
                style={inputStyle}
              />
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput("");
                setBalanceMin("");
                setBalanceMax("");
                setValues({
                  page: "1",
                  operator_id: "",
                  search: "",
                  is_active: "",
                  playing_now: "",
                  balance_min: "",
                  balance_max: "",
                  include_test: "",
                });
              }}
              className="rounded-lg px-3 py-2 text-sm max-md:w-full max-md:min-h-[44px]"
              style={{ backgroundColor: "#262626", color: "#d1d5db" }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {refreshing && !loading && (
        <div
          className="text-xs flex items-center gap-2"
          style={{ color: "#6a7282" }}
          role="status"
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              border: "2px solid rgba(240,177,0,0.35)",
              borderTopColor: "#f0b100",
              display: "inline-block",
              animation: "prg-spin 0.7s linear infinite",
            }}
          />
          Refreshing…
        </div>
      )}
      <style>{"@keyframes prg-spin{to{transform:rotate(360deg)}}"}</style>

      <DataTable
        columns={columns}
        data={players}
        loading={loading}
        emptyMessage="No players found"
        searchPlaceholder="Search in results..."
        onRowClick={(row) => router.push(`/admin/players/${row.id}`)}
        pageSize={pageSize}
        disablePagination
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        label="players"
        pageSize={pageSize}
        onPage={(p) => setValues({ page: String(p) })}
        onPageSize={(n) => setFilter({ page_size: String(n) })}
      />

    </div>
  );
}


/**
 * useSearchParams() forces a client-side bail-out during prerender, and Next
 * fails the BUILD unless the component reading it sits under a Suspense
 * boundary. Filters live in the URL now (see useUrlFilters), so every page that
 * adopts that pattern needs this wrapper.
 *
 * The fallback is the same skeleton state the table shows while loading, so the
 * boundary is invisible in practice — it exists to satisfy prerendering, not to
 * introduce a second loading look.
 */
export default function PlayersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <div
            className="rounded-xl"
            style={{ height: 360, backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
          />
        </div>
      }
    >
      <PlayersPageInner />
    </Suspense>
  );
}
