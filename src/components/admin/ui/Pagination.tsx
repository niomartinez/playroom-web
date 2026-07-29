"use client";

/**
 * Server-side pagination with actual page NUMBERS.
 *
 * Prev/Next alone tells you nothing about where you are or how far it goes, and
 * reaching page 9 means clicking Next eight times. Numbers make the size of the
 * data legible and any page one click away.
 *
 * Long ranges are elided rather than rendering 400 buttons: first, last, and a
 * window around the current page, with "…" standing in for the gaps. The
 * first/last are always present because "how much is there" is most of the
 * value, and jumping to the end is a real thing people do.
 */

/** Page numbers to render, with `null` marking an elision. */
export function pageRange(
  current: number,
  total: number,
  window = 1,
): (number | null)[] {
  if (total <= 1) return [1];

  const pages = new Set<number>([1, total]);
  for (let p = current - window; p <= current + window; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  // Keep the row a stable width near the ends, so the controls don't jump
  // around as you page through the first few.
  if (current <= 3) for (const p of [2, 3, 4]) if (p <= total) pages.add(p);
  if (current >= total - 2) {
    for (const p of [total - 1, total - 2, total - 3]) if (p >= 1) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}

interface Props {
  page: number;
  totalPages: number;
  total: number;
  /** What is being counted, for the summary line: "players", "rounds". */
  label: string;
  pageSize: number;
  onPage: (page: number) => void;
  /** Optional page-size control; omitted when the caller has no such filter. */
  onPageSize?: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function Pagination({
  page,
  totalPages,
  total,
  label,
  pageSize,
  onPage,
  onPageSize,
  pageSizeOptions = [20, 50, 100],
}: Props) {
  // A single page still shows the count and the size control — "12 players" is
  // information, and hiding the control the moment a filter narrows the list is
  // how you strand someone on a page size they can't change back.
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // minWidth lives in a class, not here, so the mobile 44px touch target can
  // override it — an inline style would win over the breakpoint.
  const btnClass =
    "min-w-[30px] max-md:min-w-[44px] max-md:min-h-[44px]";

  const btn = (active: boolean) =>
    ({
      padding: "4px 8px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: active ? 700 : 500,
      color: active ? "#0a0a0a" : "#99a1af",
      backgroundColor: active ? "#f0b100" : "transparent",
      border: active ? "none" : "1px solid rgba(255,255,255,0.08)",
      cursor: active ? "default" : "pointer",
    }) as const;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 text-xs"
      style={{ color: "#6a7282" }}
    >
      <div className="flex items-center gap-3">
        <span>
          {total === 0
            ? `No ${label}`
            : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} ${label}`}
        </span>
        {onPageSize && (
          <label className="flex items-center gap-1">
            <span>Show</span>
            <select
              value={String(pageSize)}
              onChange={(e) => onPageSize(Number(e.target.value))}
              className="rounded px-2 py-1 text-white outline-none max-md:min-h-[44px]"
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(208,135,0,0.15)",
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="rounded px-2 py-1 disabled:opacity-30 hover:bg-white/5 max-md:min-h-[44px] max-md:px-3"
            style={{ color: "#99a1af" }}
            aria-label="Previous page"
          >
            Prev
          </button>

          {pageRange(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => p !== page && onPage(p)}
                style={btn(p === page)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={p === page ? btnClass : `${btnClass} hover:bg-white/5`}
              >
                {p}
              </button>
            ),
          )}

          <button
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            className="rounded px-2 py-1 disabled:opacity-30 hover:bg-white/5 max-md:min-h-[44px] max-md:px-3"
            style={{ color: "#99a1af" }}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
