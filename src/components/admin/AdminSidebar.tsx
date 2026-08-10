"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAdmin } from "@/lib/admin-context";
import { isProdEnv } from "@/lib/server-env";

/** Everything the drawer's focus trap considers tabbable. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Hidden on production (test-only surfaces). */
  stagingOnly?: boolean;
  /** Permission section this page belongs to — must match a section name in
   *  the backend's app/permissions.py. An item is shown only if the signed-in
   *  account can READ it. This is presentation, not protection: the API gates
   *  every one of these endpoints itself. */
  section: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    section: "dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "IP Allowlist",
    href: "/admin/ip-allowlist",
    section: "ip_allowlist",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    label: "System Providers",
    href: "/admin/operators",
    section: "operators",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7h-9" /><path d="M14 17H5" />
        <circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
      </svg>
    ),
  },
  {
    label: "Tables",
    href: "/admin/tables",
    section: "tables",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" /><path d="M9 21V9" />
      </svg>
    ),
  },
  {
    label: "Players",
    href: "/admin/players",
    section: "players",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Rounds",
    href: "/admin/rounds",
    section: "rounds",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/admin/reports",
    section: "reports",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: "Monitoring",
    href: "/admin/monitoring",
    section: "monitoring",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    label: "Audit Log",
    href: "/admin/audit",
    section: "audit",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: "Users",
    href: "/admin/users",
    section: "users",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Pitch links",
    href: "/admin/pitch-links",
    section: "pitch_links",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    label: "Test tokens",
    href: "/admin/test-tokens",
    section: "test_tokens",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    /* Naming and correcting the DERIVED site dimension. Under `settings`
       because a merge changes what the money reports attribute to each site —
       the same weight as editing bet limits, not a cosmetic preference. */
    label: "Sites",
    href: "/admin/sites",
    section: "settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4" ry="10" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/admin/settings",
    section: "settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
    canRead,
  } = useAdmin();
  // Test-only nav items are hidden on production.
  const prodEnv = isProdEnv();

  const asideRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  /* Close the drawer whenever the route changes. Desktop never opens it, so
     this is a no-op above lg. */
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  /* While the drawer is open: lock body scroll, trap Tab inside it, close on
     Escape. Everything is torn down when it closes or the component unmounts. */
  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const visibleFocusable = () =>
      Array.from(
        asideRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
      ).filter((el) => el.getClientRects().length > 0);

    visibleFocusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const node = asideRef.current;
      if (!node) return;
      const items = visibleFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !active || !node.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !active || !node.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen, setMobileNavOpen]);

  /* Hand focus back to the hamburger once the drawer closes. */
  useEffect(() => {
    if (wasOpenRef.current && !mobileNavOpen) {
      document.getElementById("admin-mobile-nav-toggle")?.focus();
    }
    wasOpenRef.current = mobileNavOpen;
  }, [mobileNavOpen]);

  return (
    <>
      {/* Drawer backdrop (below lg only) */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-sidebar"
        ref={asideRef}
        className={
          "shrink-0 flex flex-col h-full transition-all duration-200 " +
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:h-[100dvh] " +
          "max-lg:w-[280px]! max-lg:max-w-[85vw] max-lg:shadow-2xl " +
          "max-lg:motion-reduce:transition-none " +
          (mobileNavOpen
            ? "max-lg:visible max-lg:translate-x-0"
            : "max-lg:invisible max-lg:-translate-x-full")
        }
        style={{
          width: sidebarCollapsed ? 64 : 220,
          backgroundColor: "#0a0a0a",
          borderRight: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        {/* Logo + collapse toggle */}
        <div
          className="flex items-center justify-between px-3 shrink-0"
          style={{
            height: 56,
            borderBottom: "1px solid rgba(208,135,0,0.15)",
          }}
        >
          <img
            src="/logo.png"
            alt="Playroom Gaming"
            className={
              "h-8 object-contain" + (sidebarCollapsed ? " hidden max-lg:block" : "")
            }
          />

          {/* Drawer close (below lg only) */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden flex h-11 w-11 items-center justify-center rounded hover:bg-white/5 transition-colors"
            aria-label="Close navigation menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6a7282"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="max-lg:hidden p-1.5 rounded hover:bg-white/5 transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6a7282"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sidebarCollapsed ? (
                <>
                  <polyline points="9 18 15 12 9 6" />
                </>
              ) : (
                <>
                  <polyline points="15 18 9 12 15 6" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter(
            (item) => !(item.stagingOnly && prodEnv) && canRead(item.section),
          ).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors max-lg:min-h-11"
                style={{
                  color: active ? "#f0b100" : "#99a1af",
                  backgroundColor: active
                    ? "rgba(208,135,0,0.12)"
                    : "transparent",
                  borderLeft: active
                    ? "2px solid #f0b100"
                    : "2px solid transparent",
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span
                  className="shrink-0"
                  style={{ color: active ? "#f0b100" : "#6a7282" }}
                >
                  {item.icon}
                </span>
                <span className={sidebarCollapsed ? "hidden max-lg:inline" : undefined}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
