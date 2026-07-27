import Link from "next/link";

import LinkSpinner from "@/components/admin/ui/LinkSpinner";
import { pageRange } from "@/components/admin/ui/Pagination";

/**
 * Numbered pagination for the SERVER-rendered pages (the OCMS portal).
 *
 * Same job as {@link Pagination}, and it shares that component's `pageRange` so
 * the elision logic is defined once — but it renders `<Link>`s rather than
 * buttons, because those pages have no client state to update: the URL IS the
 * query, and Next re-renders on navigation.
 *
 * The caller supplies `hrefFor`, so whatever filters are active are carried
 * across a page change instead of being silently dropped.
 */
export default function PaginationLinks({
  page,
  totalPages,
  total,
  label,
  pageSize,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  total: number;
  label: string;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const numStyle = (active: boolean) =>
    ({
      minWidth: 30,
      padding: "4px 8px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: active ? 700 : 500,
      color: active ? "#0a0a0a" : "#99a1af",
      backgroundColor: active ? "#f0b100" : "transparent",
      border: active ? "none" : "1px solid rgba(255,255,255,0.08)",
      textAlign: "center" as const,
    }) as const;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 text-xs"
      style={{ color: "#6a7282" }}
    >
      <span>
        {total === 0
          ? `No ${label}`
          : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} ${label}`}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-white/5"
              style={{ color: "#99a1af" }}
            >
              <LinkSpinner /> Prev
            </Link>
          ) : (
            <span className="rounded px-2 py-1 opacity-30" style={{ color: "#99a1af" }}>
              Prev
            </span>
          )}

          {pageRange(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1" aria-hidden>
                …
              </span>
            ) : p === page ? (
              <span key={p} style={numStyle(true)} aria-current="page">
                {p}
              </span>
            ) : (
              <Link
                key={p}
                href={hrefFor(p)}
                style={numStyle(false)}
                className="hover:bg-white/5"
                aria-label={`Page ${p}`}
              >
                {p}
              </Link>
            ),
          )}

          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-white/5"
              style={{ color: "#99a1af" }}
            >
              Next <LinkSpinner />
            </Link>
          ) : (
            <span className="rounded px-2 py-1 opacity-30" style={{ color: "#99a1af" }}>
              Next
            </span>
          )}
        </div>
      )}
    </div>
  );
}
