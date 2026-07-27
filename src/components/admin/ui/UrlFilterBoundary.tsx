"use client";

import { Suspense, type ReactNode } from "react";

/**
 * Suspense boundary for any page whose filters live in the URL.
 *
 * `useSearchParams()` forces a client-side bail-out during prerender, and Next
 * fails the BUILD — not the request — unless the component reading it sits under
 * a Suspense boundary. That is how the Players migration broke the prod build
 * and needed a follow-up fix; every page adopting `useUrlFilters` needs the same
 * wrapper, so it is one component rather than a foot-gun repeated fifteen times.
 *
 * The fallback is deliberately minimal. Pages under here render from the query
 * cache almost immediately, so a detailed skeleton would flash a second loading
 * look on top of the table's own — the boundary exists to satisfy prerendering,
 * not to introduce another spinner.
 */
export default function UrlFilterBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Suspense fallback={fallback ?? <div className="min-h-[60vh]" aria-hidden />}>
      {children}
    </Suspense>
  );
}
