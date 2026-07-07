"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDebounce } from "@/lib/use-debounce";

/** Search box for the players list. Keeps filter state in the URL
 *  (?search=…&page=1) so the RSC re-fetches server-side — no client data
 *  fetching / useEffect waterfall. Debounced to avoid a nav per keystroke. */
export default function OcmsPlayersSearch({
  initialSearch,
}: {
  initialSearch: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialSearch);
  const debounced = useDebounce(value, 300);

  // Skip the first run so we don't clobber the URL on mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (debounced) params.set("search", debounced);
    // Any new search resets to page 1.
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [debounced, pathname, router]);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "#171717",
        border: "1px solid rgba(208,135,0,0.2)",
      }}
    >
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Search
          </label>
          <input
            type="text"
            placeholder="Username or external ID..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm text-white outline-none min-w-[220px]"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(208,135,0,0.15)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
