"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";

/**
 * Filter bar for the OCMS players list.
 *
 * State lives in the URL (?search=…&is_active=…&balance_min=…) so the RSC
 * re-fetches server-side — no client data fetching, no useEffect waterfall.
 *
 * IMPORTANT: every write PRESERVES the params it does not own. The earlier
 * version rebuilt the query string from scratch, which was harmless while
 * search was the only filter and became a bug the moment sorting existed:
 * typing in the search box would silently discard the column you had sorted by.
 */
export default function OcmsPlayersSearch({
  initialSearch,
  initialActive = "",
  initialBalanceMin = "",
  initialBalanceMax = "",
}: {
  initialSearch: string;
  initialActive?: string;
  initialBalanceMin?: string;
  initialBalanceMax?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const [active, setActive] = useState(initialActive);
  const [min, setMin] = useState(initialBalanceMin);
  const [max, setMax] = useState(initialBalanceMax);

  // The typed fields debounce; the select applies immediately, since picking
  // from a list is already one deliberate action.
  const debouncedSearch = useDebounce(search, 300);
  const debouncedMin = useDebounce(min, 400);
  const debouncedMax = useDebounce(max, 400);

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    // Any filter change returns to page 1 — a filtered page 7 is usually empty
    // and reads as "no results".
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Skip the first run so we don't rewrite the URL on mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    push({
      search: debouncedSearch,
      balance_min: debouncedMin,
      balance_max: debouncedMax,
    });
    // `push` closes over searchParams, which changes on every navigation; the
    // debounced values are the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedMin, debouncedMax]);

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(208,135,0,0.15)",
  } as const;

  const hasFilters = !!(search || active || min || max);

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
            Search
          </label>
          <input
            type="text"
            placeholder="Username or external ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm text-white outline-none min-w-[220px]"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Status
          </label>
          <select
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              push({ is_active: e.target.value });
            }}
            className="rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          >
            <option value="">Any</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Balance
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Min"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none w-[100px]"
              style={inputStyle}
            />
            <span style={{ color: "#6a7282" }}>–</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Max"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none w-[100px]"
              style={inputStyle}
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              setSearch("");
              setActive("");
              setMin("");
              setMax("");
              push({ search: "", is_active: "", balance_min: "", balance_max: "" });
            }}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "#262626", color: "#d1d5db" }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
