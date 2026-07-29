"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useOcms } from "@/lib/ocms-context";
import LinkSpinner from "@/components/admin/ui/LinkSpinner";

/** Everything the drawer's focus trap considers tabbable. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin-ocms",
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
    label: "Reports",
    href: "/admin-ocms/reports",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: "Players",
    href: "/admin-ocms/players",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "CS Accounts",
    href: "/admin-ocms/cs-users",
    adminOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin-ocms") return pathname === "/admin-ocms";
  return pathname.startsWith(href);
}

export default function OcmsSidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    currentUser,
    mobileNavOpen,
    setMobileNavOpen,
  } = useOcms();

  const asideRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const items = NAV_ITEMS.filter(
    (item) => !item.adminOnly || currentUser?.role === "ocms_admin"
  );

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
      const focusables = visibleFocusable();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
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
      document.getElementById("ocms-mobile-nav-toggle")?.focus();
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
        id="ocms-sidebar"
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
              "h-8 object-contain" +
              (sidebarCollapsed ? " hidden max-lg:block" : "")
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
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
        </div>

        {/* Partner badge */}
        <div
          className={
            "px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" +
            (sidebarCollapsed ? " hidden max-lg:block" : "")
          }
          style={{ color: "#6a7282" }}
        >
          Partner Portal
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-1 px-2 space-y-1 overflow-y-auto">
          {items.map((item) => {
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
                <span
                  className={
                    "flex items-center gap-2" +
                    (sidebarCollapsed ? " hidden max-lg:flex" : "")
                  }
                >
                  {item.label}
                  <LinkSpinner />
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
