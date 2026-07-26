"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filter state that lives in the URL instead of component state.
 *
 * Filters held in `useState` die when you navigate away, so returning to a page
 * dropped you back to defaults and you had to re-pick everything — and the
 * refetch that followed showed a spinner for data already in the cache.
 *
 * Putting them in the query string fixes both at once:
 *   - Back/forward restores the exact view, because the browser restores the URL.
 *   - The restored filters rebuild the same request URL, which is the cache key
 *     in {@link useAdminQuery} — so a filter you used a minute ago repaints
 *     instantly with no request at all.
 *   - The view becomes linkable: an operator can paste "players, page 3, this
 *     operator" to someone else.
 *
 * Navigation uses `replace` with `scroll: false`: changing a filter is not a new
 * place you can go "back" to, and every keystroke of a search box should not
 * become a history entry you have to press Back through fifteen times.
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(() => {
    const out = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const v = searchParams.get(String(key));
      if (v !== null) out[key] = v as T[keyof T];
    }
    return out;
  }, [searchParams, defaults]);

  const setValues = useCallback(
    (patch: Partial<T>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        // Defaults are omitted so a pristine view has a clean URL rather than
        // ?page=1&search=&operator_id=
        if (v === undefined || v === "" || v === defaults[k as keyof T]) {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, defaults],
  );

  /** Set a filter and return to page 1 — a filtered page 7 is usually empty. */
  const setFilter = useCallback(
    (patch: Partial<T>) => setValues({ ...patch, page: "1" } as Partial<T>),
    [setValues],
  );

  return { values, setValues, setFilter };
}
