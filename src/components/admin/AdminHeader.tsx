"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "@/lib/admin-context";
import AdminManualDialog from "@/components/admin/AdminManualDialog";

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
  const [showManual, setShowManual] = useState(false);

  /* Self-service password change. The backend endpoint and the /api route
     already existed for the FORCED reset flow, but there was no way for an admin
     to change their own password voluntarily — only a superadmin resetting
     someone else from the Users page. */
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwDone, setPwDone] = useState(false);

  async function submitPassword() {
    setPwError("");
    if (newPassword.length < 8) {
      setPwError("Use at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("The two passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && !json.error) {
        setPwDone(true);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwError(json.error || json.message || "Could not change the password.");
      }
    } catch {
      setPwError("Could not change the password.");
    } finally {
      setPwSaving(false);
    }
  }

  function closePasswordDialog() {
    setShowPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPwError("");
    setPwDone(false);
  }

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
          onClick={() => setShowManual(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
          style={{ color: "#d08700" }}
          title="Admin Manual"
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
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Manual
        </button>

        <button
          onClick={() => setShowPassword(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
          style={{ color: "#99a1af" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Password
        </button>

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

      <AdminManualDialog open={showManual} onClose={() => setShowManual(false)} />

      {showPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={closePasswordDialog} />
          <div
            className="relative w-full max-w-sm rounded-xl p-6"
            style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.25)" }}
          >
            <h2 className="text-lg font-bold text-white mb-1">Change your password</h2>
            <p className="text-xs mb-4" style={{ color: "#6a7282" }}>
              Signed in as {currentUser?.display_name || currentUser?.email}. You
              stay logged in on this device; other sessions keep their old token
              until it expires.
            </p>

            {pwDone ? (
              <>
                <div
                  className="rounded-lg p-3 text-sm mb-4"
                  style={{ backgroundColor: "rgba(0,201,81,0.1)", color: "#7bf1a8" }}
                >
                  Password changed.
                </div>
                <button
                  onClick={closePasswordDialog}
                  className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-black"
                  style={{ backgroundColor: "#f0b100" }}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none mb-3"
                  style={{ backgroundColor: "#0a0a0a", border: "1px solid #262626" }}
                />
                <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  onKeyDown={(e) => { if (e.key === "Enter") submitPassword(); }}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={{ backgroundColor: "#0a0a0a", border: "1px solid #262626" }}
                />
                {pwError && (
                  <p className="text-xs mt-2" style={{ color: "#ff6467" }}>{pwError}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={closePasswordDialog}
                    className="flex-1 rounded-lg px-4 py-2 text-sm font-medium"
                    style={{ backgroundColor: "#262626", color: "#d1d5db" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitPassword}
                    disabled={pwSaving}
                    className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                    style={{ backgroundColor: "#f0b100" }}
                  >
                    {pwSaving ? "Saving..." : "Change password"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
