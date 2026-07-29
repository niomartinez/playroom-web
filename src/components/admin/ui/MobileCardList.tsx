"use client";

import Link from "next/link";

import Skeleton from "@/components/admin/ui/Skeleton";

/**
 * MobileCardList — a table row, rendered as a card.
 *
 * Below `md` a six-column admin table is unreadable: it either side-scrolls or
 * squashes. This is the shared shape we fall back to instead — a heading that
 * identifies the row, then label/value pairs underneath.
 *
 * It is deliberately independent of `DataTable`'s `Column<T>` array so the
 * hand-rolled tables (the OCMS lists, the detail pages) can adopt the same
 * pattern without first being rewritten into a DataTable. Give it plain items.
 *
 * A card that does something is a real `<button>` or `<Link>`, never a `<div>`
 * with an onClick: a click handler on a div is invisible to the keyboard and to
 * a screen reader, and on a phone the admin panel has no other way in.
 */

/** One label/value pair inside a card. */
export interface MobileCardField {
  label: string;
  value: React.ReactNode;
}

/** One card. `title` identifies the row; `rows` are its remaining fields. */
export interface MobileCardItem {
  /** Stable React key. Falls back to the array index. */
  id?: string | number;
  title: React.ReactNode;
  rows: MobileCardField[];
  /** Makes the whole card a `<button>`. Wins over `href`. */
  onClick?: () => void;
  /** Makes the whole card a `<Link>`. Ignored when `onClick` is set. */
  href?: string;
  /** Accessible name for the interactive card. Defaults to the card content. */
  actionLabel?: string;
}

export interface MobileCardListProps {
  items: MobileCardItem[];
  loading?: boolean;
  /** Placeholder cards shown while loading. */
  loadingCount?: number;
  emptyMessage?: string;
  className?: string;
}

const CARD = {
  backgroundColor: "#0a0a0a",
  border: "1px solid rgba(208,135,0,0.15)",
} as const;

/** 44px is the minimum comfortable touch target; the card is usually taller. */
const TAP = "flex w-full min-h-[44px] items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors active:bg-[rgba(208,135,0,0.06)]";

function Chevron() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6a7282"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function CardBody({ item }: { item: MobileCardItem }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white break-words">
          {item.title}
        </div>
        {item.rows.length > 0 && (
          <dl className="mt-2 space-y-1.5">
            {item.rows.map((field, i) => (
              <div
                key={`${field.label}-${i}`}
                className="flex items-baseline justify-between gap-3"
              >
                <dt
                  className="shrink-0 text-[10px] uppercase tracking-wider"
                  style={{ color: "#6a7282" }}
                >
                  {field.label}
                </dt>
                <dd className="min-w-0 text-right text-xs text-white break-words">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {(item.onClick || item.href) && <Chevron />}
    </>
  );
}

export default function MobileCardList({
  items,
  loading = false,
  loadingCount = 4,
  emptyMessage = "No data found",
  className = "",
}: MobileCardListProps) {
  if (loading) {
    return (
      <div className={`space-y-2 ${className}`} aria-busy="true">
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={i} className="rounded-lg px-4 py-3" style={CARD}>
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`rounded-lg px-4 py-8 text-center text-sm ${className}`}
        style={{ ...CARD, color: "#6a7282" }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      {items.map((item, i) => (
        <li key={item.id ?? i}>
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              aria-label={item.actionLabel}
              className={TAP}
              style={CARD}
            >
              <CardBody item={item} />
            </button>
          ) : item.href ? (
            <Link
              href={item.href}
              aria-label={item.actionLabel}
              className={TAP}
              style={CARD}
            >
              <CardBody item={item} />
            </Link>
          ) : (
            <div className="flex gap-3 rounded-lg px-4 py-3" style={CARD}>
              <CardBody item={item} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
