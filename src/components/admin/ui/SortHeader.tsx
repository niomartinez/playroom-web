"use client";

/**
 * A column header that sorts on the SERVER.
 *
 * DataTable's built-in `sortable` sorts the array it was handed. On a
 * server-paginated table that array is one page, so "sort by balance
 * descending" silently meant "highest balance among these twenty" — a
 * different answer to the one the header promises, and one an admin has no way
 * to tell apart from the real thing. Every sortable column on a paged table
 * uses this instead, and the backend only offers keys it can actually order by.
 *
 * Clicking the active column flips direction; clicking a new one starts at the
 * direction that is most useful for its type — descending for numbers and dates
 * (biggest balance, newest round), ascending for text (A–Z).
 */
export type SortDir = "asc" | "desc";

export function nextSort(
  key: string,
  activeKey: string,
  activeDir: SortDir,
  defaultDir: SortDir,
): { sort_by: string; sort_dir: SortDir } {
  if (key === activeKey) {
    return { sort_by: key, sort_dir: activeDir === "asc" ? "desc" : "asc" };
  }
  return { sort_by: key, sort_dir: defaultDir };
}

/**
 * Exported because a table header is a desktop-only affordance: below `md`
 * there is no `<thead>` to click. DataTable reads these props off the header
 * element it was handed and re-offers the same sort as a `<select>`, so the
 * sort keeps happening in the database rather than quietly degrading to a
 * reorder of the page you can already see.
 */
export interface SortHeaderProps {
  label: string;
  sortKey: string;
  activeKey: string;
  activeDir: SortDir;
  /** Direction applied when this column first becomes active. */
  defaultDir?: SortDir;
  onSort: (next: { sort_by: string; sort_dir: SortDir }) => void;
  align?: "left" | "right";
}

export default function SortHeader({
  label,
  sortKey,
  activeKey,
  activeDir,
  defaultDir = "desc",
  onSort,
  align = "left",
}: SortHeaderProps) {
  const active = activeKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(nextSort(sortKey, activeKey, activeDir, defaultDir))}
      className="inline-flex items-center gap-1 hover:text-white transition-colors"
      style={{
        color: active ? "#f0b100" : "inherit",
        fontWeight: active ? 700 : "inherit",
        flexDirection: align === "right" ? "row-reverse" : "row",
      }}
      // Screen readers get the state; the caret alone is not an announcement.
      aria-label={
        active
          ? `${label}, sorted ${activeDir === "asc" ? "ascending" : "descending"}. Activate to reverse.`
          : `${label}, not sorted. Activate to sort.`
      }
    >
      <span>{label}</span>
      <span aria-hidden style={{ fontSize: 9, opacity: active ? 1 : 0.35 }}>
        {active ? (activeDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );
}
