"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "@/lib/admin-context";

/**
 * Keep an account out of the pages its role cannot read.
 *
 * The sidebar already hides those pages, but hiding a link is not keeping
 * someone out of a URL — a bookmark, a shared link, or the address bar all
 * bypass the nav. This closes that, and sends them somewhere they ARE allowed
 * rather than to a dead end.
 *
 * It is a courtesy, not the control. Every endpoint behind these pages is gated
 * on the same section in the backend (app/permissions.py), so a route that slips
 * past this renders a page whose data requests all come back 403.
 */

/** Route prefix -> permission section. Longest match wins. */
const ROUTE_SECTIONS: [string, string][] = [
  ["/admin/ip-allowlist", "ip_allowlist"],
  ["/admin/operators", "operators"],
  ["/admin/tables", "tables"],
  ["/admin/players", "players"],
  ["/admin/rounds", "rounds"],
  ["/admin/reports", "reports"],
  ["/admin/monitoring", "monitoring"],
  ["/admin/audit", "audit"],
  ["/admin/users", "users"],
  ["/admin/pitch-links", "pitch_links"],
  ["/admin/test-tokens", "test_tokens"],
  ["/admin/settings", "settings"],
  ["/admin", "dashboard"],
];

/** Where to send someone whose landing page is denied, best first. */
const FALLBACKS: [string, string][] = [
  ["/admin", "dashboard"],
  ["/admin/reports", "reports"],
  ["/admin/rounds", "rounds"],
  ["/admin/tables", "tables"],
];

export function sectionForPath(pathname: string): string | null {
  for (const [prefix, section] of ROUTE_SECTIONS) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return section;
  }
  return null;
}

export default function SectionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, currentUser, canRead } = useAdmin();

  const section = sectionForPath(pathname);
  // Wait for /me before judging: permissions start empty, so acting early would
  // bounce everyone off their own dashboard on first paint.
  const denied =
    !loading && !!currentUser && !!section && !canRead(section);

  useEffect(() => {
    if (!denied) return;
    const destination = FALLBACKS.find(([, s]) => canRead(s));
    // An account allowed nothing at all has no business holding a session.
    router.replace(destination ? destination[0] : "/admin/login");
  }, [denied, canRead, router]);

  if (denied) return null;
  return <>{children}</>;
}
