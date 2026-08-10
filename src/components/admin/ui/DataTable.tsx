"use client";

import { isValidElement, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import MobileCardList, {
  type MobileCardItem,
} from "@/components/admin/ui/MobileCardList";
import SortHeader, {
  type SortDir,
  type SortHeaderProps,
} from "@/components/admin/ui/SortHeader";
import SortHeaderLink, {
  type SortHeaderLinkProps,
} from "@/components/admin/ui/SortHeaderLink";

export interface Column<T> {
  key: string;
  label: string;
  /**
   * Client-side sort of the rows THIS TABLE WAS GIVEN.
   *
   * Correct on a fully client-paginated table. On a server-paginated one it
   * reorders only the current page, so "sort by balance" quietly means "among
   * these twenty" — use `header` with a SortHeader instead, which sorts in the
   * database.
   */
  sortable?: boolean;
  /** Custom header node — used to drive server-side sorting. Wins over label. */
  header?: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  /** How this column appears in mobile card mode. Default: "row". */
  mobile?: "title" | "row" | "hide";
  /** Shorter label to use in card mode when the table header is verbose. */
  mobileLabel?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (key: string, dir: "asc" | "desc") => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  /**
   * Drop the built-in search box. Set this when the page already has its own
   * search that queries the SERVER — two boxes that look alike but search
   * different sets (all rows vs the twenty on screen) is worse than one.
   */
  hideSearch?: boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  disablePagination?: boolean;
}

/** Read a header element's props back, but only if it really is `type`. */
function propsOf<P>(node: React.ReactNode, type: React.ElementType): P | null {
  if (!isValidElement(node) || node.type !== type) return null;
  return node.props as P;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  onSort,
  searchPlaceholder = "Search...",
  hideSearch = false,
  onSearch,
  onRowClick,
  pageSize = 10,
  disablePagination = false,
}: DataTableProps<T>) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  // Client-side search filter when no onSearch handler provided
  const filteredData = useMemo(() => {
    if (onSearch || !search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns, onSearch]);

  const totalPages = disablePagination ? 1 : Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pagedData = disablePagination ? filteredData : filteredData.slice(page * pageSize, (page + 1) * pageSize);

  function handleSort(key: string) {
    const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(newDir);
    onSort?.(key, newDir);
  }

  function handleSearch(q: string) {
    setSearch(q);
    setPage(0);
    onSearch?.(q);
  }

  /* ---------------------------------------------------------------- *
   * Card mode (below md). Everything from here to the return is used  *
   * only by the card branch; the <table> below is untouched.          *
   * ---------------------------------------------------------------- */

  function cell(col: Column<T>, row: T): React.ReactNode {
    return col.render
      ? col.render(row)
      : (row[col.key] as React.ReactNode) ?? "\u2014";
  }

  const cardColumns = columns.filter((col) => col.mobile !== "hide");
  const titleColumn =
    columns.find((col) => col.mobile === "title") ?? cardColumns[0];
  const fieldColumns = cardColumns.filter((col) => col !== titleColumn);

  const cardItems: MobileCardItem[] = pagedData.map((row, i) => {
    const title = titleColumn ? cell(titleColumn, row) : null;
    return {
      id: i,
      title,
      rows: fieldColumns.map((col) => ({
        label: col.mobileLabel ?? col.label,
        value: cell(col, row),
      })),
      onClick: onRowClick ? () => onRowClick(row) : undefined,
      // A rendered cell is often an element; only a plain value makes a useful
      // accessible name. Otherwise the card's own content names the button.
      actionLabel:
        typeof title === "string" || typeof title === "number"
          ? String(title)
          : undefined,
    };
  });

  /* A column header is unreachable in card mode, so the sort is re-offered as
     a pair of selects. Server-sorted columns keep sorting on the server —
     through the SAME callback (or the same URL) the header would have used, so
     nothing silently degrades into "sorted among the twenty rows on screen". */
  type SortOption = {
    key: string;
    label: string;
    defaultDir: SortDir;
    apply: (dir: SortDir) => void;
  };

  const sortOptions: SortOption[] = [];
  let serverSort: { key: string; dir: SortDir } | null = null;

  for (const col of columns) {
    const cb = propsOf<SortHeaderProps>(col.header, SortHeader);
    const link = propsOf<SortHeaderLinkProps>(col.header, SortHeaderLink);
    if (cb) {
      serverSort ??= { key: cb.activeKey, dir: cb.activeDir };
      sortOptions.push({
        key: cb.sortKey,
        label: col.mobileLabel ?? cb.label,
        defaultDir: cb.defaultDir ?? "desc",
        apply: (dir) => cb.onSort({ sort_by: cb.sortKey, sort_dir: dir }),
      });
    } else if (link) {
      serverSort ??= { key: link.activeKey, dir: link.activeDir };
      sortOptions.push({
        key: link.sortKey,
        label: col.mobileLabel ?? link.label,
        defaultDir: link.defaultDir ?? "desc",
        apply: (dir) =>
          router.push(link.hrefFor({ sort_by: link.sortKey, sort_dir: dir })),
      });
    } else if (col.sortable && !col.header) {
      sortOptions.push({
        key: col.key,
        label: col.mobileLabel ?? col.label,
        defaultDir: "asc",
        apply: (dir) => {
          setSortKey(col.key);
          setSortDir(dir);
          onSort?.(col.key, dir);
        },
      });
    }
  }

  const activeSortKey = serverSort ? serverSort.key : sortKey ?? "";
  const activeSortDir: SortDir = serverSort ? serverSort.dir : sortDir;
  const activeSortOption =
    sortOptions.find((opt) => opt.key === activeSortKey) ?? null;

  const selectStyle = {
    backgroundColor: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(208,135,0,0.15)",
  } as const;
  const selectClass =
    "w-full min-h-[44px] rounded-lg px-3 text-sm text-white outline-none disabled:opacity-40";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "#171717",
        border: "1px solid rgba(208,135,0,0.2)",
      }}
    >
      {/* Search bar.
          The condition used to be `(onSearch || true)` — always true — so the
          box rendered even on pages that already had their own server-side
          search, giving two lookalike inputs that searched different sets. */}
      {!hideSearch && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-xs rounded-lg px-3 py-2 text-sm text-white outline-none max-md:max-w-none max-md:min-h-[44px]"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(208,135,0,0.15)",
            }}
          />
        </div>
      )}

      {/* Cards (below md) */}
      <div className="md:hidden px-4 py-4 space-y-4">
        {sortOptions.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <label
              className="flex min-w-[9rem] flex-1 flex-col gap-1 text-[10px] uppercase tracking-wider"
              style={{ color: "#d08700" }}
            >
              Sort by
              <select
                value={activeSortOption ? activeSortKey : ""}
                onChange={(e) => {
                  const opt = sortOptions.find((o) => o.key === e.target.value);
                  if (!opt) return;
                  opt.apply(
                    opt.key === activeSortKey ? activeSortDir : opt.defaultDir,
                  );
                }}
                className={selectClass}
                style={selectStyle}
              >
                {!activeSortOption && <option value="">Default</option>}
                {sortOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="flex min-w-[9rem] flex-1 flex-col gap-1 text-[10px] uppercase tracking-wider"
              style={{ color: "#d08700" }}
            >
              Order
              <select
                value={activeSortDir}
                disabled={!activeSortOption}
                onChange={(e) =>
                  activeSortOption?.apply(e.target.value as SortDir)
                }
                className={selectClass}
                style={selectStyle}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
          </div>
        )}

        <MobileCardList
          items={cardItems}
          loading={loading}
          emptyMessage={emptyMessage}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-md:hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                  style={{
                    color: "#d08700",
                    cursor: col.sortable && !col.header ? "pointer" : "default",
                  }}
                  onClick={() =>
                    col.sortable && !col.header && handleSort(col.key)
                  }
                >
                  {col.header ?? (
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        <span className="text-[10px]">
                          {sortDir === "asc" ? "\u25B2" : "\u25BC"}
                        </span>
                      )}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center"
                  style={{ color: "#6a7282" }}
                >
                  Loading...
                </td>
              </tr>
            ) : pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center"
                  style={{ color: "#6a7282" }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pagedData.map((row, i) => (
                <tr
                  key={i}
                  className="transition-colors"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: onRowClick ? "pointer" : "default",
                  }}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(208,135,0,0.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-white"
                    >
                      {col.render
                        ? col.render(row)
                        : (row[col.key] as React.ReactNode) ?? "\u2014"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!disablePagination && totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 text-xs max-md:flex-col max-md:items-stretch max-md:gap-3"
          style={{
            borderTop: "1px solid rgba(208,135,0,0.1)",
            color: "#6a7282",
          }}
        >
          <span className="max-md:text-center">
            Page {page + 1} of {totalPages} ({filteredData.length} rows)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="rounded px-3 py-1 disabled:opacity-30 transition-colors hover:bg-white/5 max-md:flex-1 max-md:min-h-[44px]"
              style={{ color: "#99a1af" }}
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="rounded px-3 py-1 disabled:opacity-30 transition-colors hover:bg-white/5 max-md:flex-1 max-md:min-h-[44px]"
              style={{ color: "#99a1af" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
