"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useOcms } from "@/lib/ocms-context";

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
  const { sidebarCollapsed, setSidebarCollapsed, currentUser } = useOcms();

  const items = NAV_ITEMS.filter(
    (item) => !item.adminOnly || currentUser?.role === "ocms_admin"
  );

  return (
    <aside
      className="shrink-0 flex flex-col h-full transition-all duration-200"
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
        {!sidebarCollapsed && (
          <img
            src="/logo.png"
            alt="Play Room Gaming"
            className="h-8 object-contain"
          />
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded hover:bg-white/5 transition-colors"
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
      {!sidebarCollapsed && (
        <div
          className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "#6a7282" }}
        >
          Partner Portal
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-1 px-2 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
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
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
