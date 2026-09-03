"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiOk } from "./api-result";

/**
 * Cached data fetching for the back office.
 *
 * Every admin page was `useEffect` + `fetch` + local state, which means the data
 * dies with the component. Navigating away and back — or re-applying a filter
 * you used a minute ago — refetched from scratch and showed a spinner for
 * something the browser had already been told. That is the complaint this
 * exists to fix.
 *
 * Behaviour (stale-while-revalidate):
 *   - A cached entry renders IMMEDIATELY, with no loading state at all. Going
 *     back to a page, or re-selecting a previous filter, is instant.
 *   - It then revalidates in the background if older than {@link STALE_MS}, and
 *     swaps in fresh data without ever blanking the screen.
 *   - Only a key that has never been fetched shows a loading state, so skeletons
 *     appear on genuinely-new data and nowhere else.
 *
 * The cache is MODULE-LEVEL on purpose: it has to outlive component unmounts,
 * which is the entire point. It is keyed by the request URL, so different
 * filters/pages are naturally separate entries and re-selecting an old filter
 * hits a warm one.
 *
 * Deliberately hand-rolled rather than adding SWR/react-query: this is ~100
 * lines against a dependency that would also need wiring into the app shell,
 * and the back office needs exactly one pattern.
 */

/** How long a cached entry is served without a background refresh. */
const STALE_MS = 30_000;
/** Hard cap so a long session can't grow the cache without bound. */
const MAX_ENTRIES = 100;

interface Entry {
  data: unknown;
  at: number;
  /** In-flight request, so concurrent mounts share one network call. */
  inflight?: Promise<unknown>;
}

const cache = new Map<string, Entry>();

/** Drop the oldest entries once the cache exceeds MAX_ENTRIES. */
function evict() {
  if (cache.size <= MAX_ENTRIES) return;
  const byAge = [...cache.entries()].sort((a, b) => a[1].at - b[1].at);
  for (const [k] of byAge.slice(0, cache.size - MAX_ENTRIES)) cache.delete(k);
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!isApiOk(res, body as never)) {
    throw new Error(
      (body as { message?: string; error?: string } | null)?.message ||
        (body as { error?: string } | null)?.error ||
        `Request failed (${res.status})`,
    );
  }
  // Unwrap BaseResponse; a plain JSON route is passed through untouched.
  const b = body as { data?: unknown } | null;
  return b && typeof b === "object" && "data" in b ? b.data : body;
}

export interface AdminQueryResult<T> {
  data: T | undefined;
  /** True only when there is nothing cached to show — i.e. show a skeleton. */
  loading: boolean;
  /** True while refreshing something already on screen — i.e. a subtle hint. */
  refreshing: boolean;
  error: string | null;
  /** Force a refetch (after a mutation). */
  refetch: () => void;
}

export function useAdminQuery<T = unknown>(
  url: string | null,
  opts: { enabled?: boolean; keepPrevious?: boolean } = {},
): AdminQueryResult<T> {
  const enabled = opts.enabled !== false && !!url;
  const keepPrevious = opts.keepPrevious === true;
  const cached = url ? cache.get(url) : undefined;

  const [, forceRender] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Guards against setState after unmount during an in-flight request.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (force: boolean) => {
      if (!url || !enabled) return;
      const existing = cache.get(url);
      const fresh = existing && Date.now() - existing.at < STALE_MS;
      if (!force && fresh && !existing.inflight) return;

      // Share one request across concurrent callers of the same key.
      if (existing?.inflight) {
        await existing.inflight.catch(() => undefined);
        if (aliveRef.current) forceRender((n) => n + 1);
        return;
      }

      if (existing) setRefreshing(true);
      const p = fetchJson(url);
      cache.set(url, { data: existing?.data, at: existing?.at ?? 0, inflight: p });
      try {
        const data = await p;
        cache.set(url, { data, at: Date.now() });
        evict();
        if (aliveRef.current) setError(null);
      } catch (e) {
        // Keep any previous data on screen — a failed refresh should never
        // blank a table the operator is reading.
        if (existing) cache.set(url, { data: existing.data, at: existing.at });
        else cache.delete(url);
        if (aliveRef.current) {
          setError(e instanceof Error ? e.message : "Request failed");
        }
      } finally {
        if (aliveRef.current) {
          setRefreshing(false);
          forceRender((n) => n + 1);
        }
      }
    },
    [url, enabled],
  );

  useEffect(() => {
    void run(false);
  }, [run]);

  const entry = url ? cache.get(url) : undefined;

  /* `keepPrevious` — stale-while-revalidate ACROSS a key change, not just on a
     revisit.
     
     The cache is keyed by URL, so "loading" was true for any key with no data
     yet. That is right for a revisit (you have been here, the data is warm) but
     wrong for a FILTER change, which always mints a brand-new key. Every date
     preset on the reports page therefore made all four queries "loading" at
     once, and the page's `{loading ? spinner : content}` gate unmounted the
     tiles, the tab bar and the table until the slowest aggregation came back.
     
     Measured on production: 1,627ms with the tab bar absent from the DOM.
     Click a tab in that window and there is no button to receive it — the
     content returns on the old tab and it reads as "I clicked and nothing
     happened". Two people reported exactly that, on two different controls,
     before anyone worked out the control was never there.
     
     Holding the last resolved value means the numbers stay on screen and go
     stale for a moment instead of vanishing, which is what this hook's own
     docblock promises ("without ever blanking the screen") and what
     `refreshing` + RefreshingHint already exist to communicate. `loading` then
     means what it should: nothing has EVER been shown here. */
  const previousRef = useRef<unknown>(undefined);
  useEffect(() => {
    if (entry?.data !== undefined) previousRef.current = entry.data;
  }, [entry?.data]);

  const fresh = entry?.data;
  const fallback = keepPrevious ? previousRef.current : undefined;
  const data = fresh !== undefined ? fresh : fallback;
  // Serving a previous value while a new key loads is a REFRESH, not a load —
  // otherwise the hint never appears for the case it was built for.
  const servingStale = enabled && fresh === undefined && data !== undefined && !error;

  return {
    data: data as T | undefined,
    // Only a key with nothing to show at all is "loading" — that is what keeps
    // a revisit instant instead of flashing a skeleton over data we already
    // have, and now also keeps a filter change from blanking the page.
    loading: enabled && data === undefined && !error,
    refreshing: refreshing || servingStale,
    error,
    refetch: () => void run(true),
  };
}

/**
 * Invalidate cached entries after a mutation.
 *
 * Pass a prefix (e.g. "/api/admin/players") to drop every page/filter
 * combination for that resource, since a create/delete can change any of them.
 */
export function invalidateAdminQuery(prefix: string): void {
  for (const k of [...cache.keys()]) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

/** Wipe everything — used on logout so the next account starts clean. */
export function clearAdminQueryCache(): void {
  cache.clear();
}
