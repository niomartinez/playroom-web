"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 *
 * THE URL IS THE RECORD, NOT THE INPUT. `router.replace` goes through the Next
 * router, which means an RSC round-trip — and on production, through the admin
 * middleware's JWT verify on top. Measured on the reports page: **1,677ms
 * between clicking a date preset and its button showing as active**. For most
 * of two seconds the control you just pressed still highlights the OLD value,
 * which reads as a dead button, so you click it again.
 *
 * So the pressed value is held locally and applied IMMEDIATELY, and the URL
 * catches up behind it. `pending` is cleared per-key the moment the URL agrees,
 * which keeps the URL authoritative for the things it must own — back/forward,
 * a pasted link, a fresh load — while never making the user wait on the network
 * to see their own click land.
 *
 * (`window.history.replaceState` was tried first, since Next documents it for
 * exactly this. On this page it updated the address bar without re-rendering
 * off `useSearchParams`, so the highlight still did not move. Hence local
 * state rather than a shallower navigation.)
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* Every caller passes `defaults` as an inline object literal, so it is a NEW
     object on every render. Depending on it directly means `values` and
     `setValues` are rebuilt every render — the useMemo/useCallback around them
     memoise nothing — and any effect keyed on them re-fires forever. That last
     part is not theoretical: it produced a "Maximum update depth exceeded"
     loop the moment an effect was added below.

     Defaults are a per-page constant by construction, so pin the first value.
     `date_from: daysAgoISO(7)` and friends are already effectively frozen at
     mount anyway — this just makes it true rather than incidental. */
  const defaultsRef = useRef(defaults);
  const stable = defaultsRef.current;

  /** Keys pressed but not yet reflected in the URL. See the docblock. */
  const [pending, setPending] = useState<Partial<T>>({});

  const fromUrl = useMemo(() => {
    const out = { ...stable };
    for (const key of Object.keys(stable) as (keyof T)[]) {
      const v = searchParams.get(String(key));
      if (v !== null) out[key] = v as T[keyof T];
    }
    return out;
  }, [searchParams, stable]);

  /* Drop an override as soon as the URL agrees with it, so the URL goes back to
     being the single source of truth. Without this, a later Back/Forward would
     be silently overridden by a stale local value. */
  useEffect(() => {
    setPending((prev) => {
      const keys = Object.keys(prev) as (keyof T)[];
      if (keys.length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      for (const k of keys) {
        if (fromUrl[k] === prev[k]) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [fromUrl]);

  const values = useMemo(
    () => ({ ...fromUrl, ...pending }) as T,
    [fromUrl, pending],
  );

  const setValues = useCallback(
    (patch: Partial<T>) => {
      // Apply on this frame. The router call below is the slow part.
      setPending((prev) => ({ ...prev, ...patch }));
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        // Defaults are omitted so a pristine view has a clean URL rather than
        // ?page=1&search=&operator_id=
        if (v === undefined || v === "" || v === stable[k as keyof T]) {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, stable],
  );

  /** Set a filter and return to page 1 — a filtered page 7 is usually empty. */
  const setFilter = useCallback(
    (patch: Partial<T>) => setValues({ ...patch, page: "1" } as Partial<T>),
    [setValues],
  );

  return { values, setValues, setFilter };
}
