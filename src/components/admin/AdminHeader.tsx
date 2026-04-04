"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "@/lib/admin-context";

/** Build breadcrumb segments from the current pathname. */
function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    // Capitalize and clean up segment labels
    const label = seg
      .replace(/-/g, " ")
      .replace(/\[.*\]/, "Detail")
      .replace(/^\w/, (c) => c.toUpperCase());
    crumbs.push({ label, href: path });
  }

  return crumbs;
}

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAdmin();
  const breadcrumbs = buildBreadcrumbs(pathname);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <header
      className="shrink-0 flex items-center justify-between px-6"
      style={{
        height: 56,
        background:
          "linear-gradient(to right, #000000 0%, #171717 50%, #000000 100%)",
        borderBottom: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 4px 12px rgba(208,135,0,0.1), 0px 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <span style={{ color: "#6a7282" }}>/</span>
            )}
            {i === breadcrumbs.length - 1 ? (
              <span style={{ color: "#f0b100" }} className="font-medium">
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

      {/* User + logout */}
      <div className="flex items-center gap-4">
        {currentUser && (
          <div className="flex items-center gap-2">
            {/* User avatar circle */}
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
              {(currentUser.display_name || currentUser.email || "A")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white leading-tight">
                {currentUser.display_name || currentUser.email}
              </span>
              <span className="text-[10px] leading-tight" style={{ color: "#6a7282" }}>
                {currentUser.role}
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
