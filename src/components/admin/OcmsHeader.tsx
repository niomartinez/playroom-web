"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOcms } from "@/lib/ocms-context";

/** Build breadcrumb segments from the current pathname. */
function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    const label = seg
      .replace(/-/g, " ")
      .replace(/\[.*\]/, "Detail")
      .replace(/^\w/, (c) => c.toUpperCase());
    crumbs.push({ label, href: path });
  }

  return crumbs;
}

export default function OcmsHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, mobileNavOpen, setMobileNavOpen } = useOcms();
  const breadcrumbs = buildBreadcrumbs(pathname);

  /* Below md the header controls collapse into a single overflow menu. */
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  async function handleLogout() {
    await fetch("/api/admin-ocms/logout", { method: "POST" });
    router.push("/admin-ocms/login");
  }

  return (
    <header
      className="shrink-0 flex items-center justify-between px-6 max-md:px-3 max-md:gap-2"
      style={{
        height: 56,
        background:
          "linear-gradient(to right, #000000 0%, #171717 50%, #000000 100%)",
        borderBottom: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 4px 12px rgba(208,135,0,0.1), 0px 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      {/* Drawer toggle. Shown wherever the sidebar is off-canvas (below lg),
          so the nav never becomes unreachable on tablet widths. */}
      <button
        id="ocms-mobile-nav-toggle"
        type="button"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        aria-label="Open navigation menu"
        aria-expanded={mobileNavOpen}
        aria-controls="ocms-sidebar"
        className="lg:hidden shrink-0 -ml-2 flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
        style={{ color: "#99a1af" }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Breadcrumbs. Below md only the final segment is kept. */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span
            key={crumb.href}
            className={
              "flex items-center gap-1.5" +
              (i === breadcrumbs.length - 1 ? " min-w-0" : " max-md:hidden")
            }
          >
            {i > 0 && (
              <span className="max-md:hidden" style={{ color: "#6a7282" }}>/</span>
            )}
            {i === breadcrumbs.length - 1 ? (
              <span style={{ color: "#f0b100" }} className="font-medium truncate">
                {crumb.label}
              </span>
            ) : (
              <span
                className="hover:underline cursor-pointer"
                style={{ color: "#99a1af" }}
                onClick={() => router.push(crumb.href)}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* Condensed controls (below md): avatar + one overflow menu */}
      <div className="relative flex md:hidden items-center gap-1 shrink-0">
        {currentUser && (
          <div
            className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
            style={{
              width: 30,
              height: 30,
              backgroundColor: "rgba(208,135,0,0.2)",
              color: "#f0b100",
              border: "1px solid rgba(208,135,0,0.3)",
            }}
          >
            {(currentUser.display_name || currentUser.email || "O")
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "#99a1af" }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl py-1"
              style={{
                backgroundColor: "#171717",
                border: "1px solid rgba(208,135,0,0.25)",
                boxShadow: "0px 12px 32px rgba(0,0,0,0.5)",
              }}
            >
              {currentUser && (
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}
                >
                  <div className="text-sm font-medium text-white truncate">
                    {currentUser.display_name || currentUser.email}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#6a7282" }}>
                    {currentUser.role === "ocms_admin" ? "Admin" : "CS"}
                  </div>
                </div>
              )}

              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full min-h-11 items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: "#99a1af" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          </>
        )}
      </div>

      {/* User + logout */}
      <div className="hidden md:flex items-center gap-4">
        {currentUser && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full text-xs font-bold"
              style={{
                width: 30,
                height: 30,
                backgroundColor: "rgba(208,135,0,0.2)",
                color: "#f0b100",
                border: "1px solid rgba(208,135,0,0.3)",
              }}
            >
              {(currentUser.display_name || currentUser.email || "O")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white leading-tight">
                {currentUser.display_name || currentUser.email}
              </span>
              <span
                className="text-[10px] leading-tight"
                style={{ color: "#6a7282" }}
              >
                {currentUser.role === "ocms_admin" ? "Admin" : "CS"}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
          style={{ color: "#99a1af" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
