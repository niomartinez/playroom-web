"use client";

import { useState, useMemo } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (key: string, dir: "asc" | "desc") => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  onSort,
  searchPlaceholder = "Search...",
  onSearch,
  onRowClick,
  pageSize = 10,
}: DataTableProps<T>) {
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

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pagedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

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

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "#171717",
        border: "1px solid rgba(208,135,0,0.2)",
      }}
    >
      {/* Search bar */}
      {(onSearch || true) && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-xs rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(208,135,0,0.15)",
            }}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                  style={{
                    color: "#d08700",
                    cursor: col.sortable ? "pointer" : "default",
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-[10px]">
                        {sortDir === "asc" ? "\u25B2" : "\u25BC"}
                      </span>
                    )}
                  </span>
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
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 text-xs"
          style={{
            borderTop: "1px solid rgba(208,135,0,0.1)",
            color: "#6a7282",
          }}
        >
          <span>
            Page {page + 1} of {totalPages} ({filteredData.length} rows)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="rounded px-3 py-1 disabled:opacity-30 transition-colors hover:bg-white/5"
              style={{ color: "#99a1af" }}
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="rounded px-3 py-1 disabled:opacity-30 transition-colors hover:bg-white/5"
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
