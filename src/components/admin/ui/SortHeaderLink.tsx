import Link from "next/link";

import { nextSort, type SortDir } from "@/components/admin/ui/SortHeader";

/**
 * A sortable column header for the SERVER-rendered pages (the OCMS portal).
 *
 * Same contract as {@link SortHeader} — and it reuses that module's `nextSort`
 * so both portals agree on what a click does — but it renders a `<Link>`,
 * because these pages carry their state in the URL and re-render on navigation
 * rather than through client state.
 *
 * `hrefFor` receives the next sort and returns a URL, which is where the
 * caller folds in whatever filters are currently active. Losing the filter on
 * a sort click would be its own bug.
 */
export default function SortHeaderLink({
  label,
  sortKey,
  activeKey,
  activeDir,
  defaultDir = "desc",
  hrefFor,
}: {
  label: string;
  sortKey: string;
  activeKey: string;
  activeDir: SortDir;
  defaultDir?: SortDir;
  hrefFor: (next: { sort_by: string; sort_dir: SortDir }) => string;
}) {
  const active = activeKey === sortKey;
  const next = nextSort(sortKey, activeKey, activeDir, defaultDir);

  return (
    <Link
      href={hrefFor(next)}
      className="inline-flex items-center gap-1 hover:text-white transition-colors"
      style={{ color: active ? "#f0b100" : "inherit", fontWeight: active ? 700 : "inherit" }}
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
    </Link>
  );
}
