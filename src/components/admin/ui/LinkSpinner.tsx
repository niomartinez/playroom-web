"use client";

import { useLinkStatus } from "next/link";

/** LinkSpinner (Pattern B) — renders a small spinner ONLY while the enclosing
 *  <Link> navigation is pending, giving instant feedback on nav/filter clicks.
 *
 *  Drop `<LinkSpinner />` inside a <Link> child. `useLinkStatus` is scoped to
 *  the nearest ancestor Link. (lucide-react is not a dependency in this repo,
 *  so the Loader2 icon is inlined as an SVG with `animate-spin`.)
 */
export default function LinkSpinner({ size = 14 }: { size?: number }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <svg
      className="animate-spin shrink-0"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Loading"
      role="status"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
