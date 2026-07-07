"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import FormDialog from "@/components/admin/ui/FormDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/lib/toast-context";
import { OCMS_TEMP_PASSWORD, OCMS_MIN_PASSWORD_LENGTH } from "@/lib/ocms-constants";
import type { OcmsCsUser } from "@/lib/ocms-server";

/**
 * Interactive CS-account management (client child of the RSC page). The table
 * data is SEEDED from the server (`initialUsers`); after every mutation we call
 * router.refresh() so the RSC re-fetches — no manual client refetch.
 */
export default function OcmsCsUsersClient({
  initialUsers,
}: {
  initialUsers: OcmsCsUser[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  /* Create dialog */
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  /* Reset password dialog */
  const [pwUser, setPwUser] = useState<OcmsCsUser | null>(null);
  const [resetting, setResetting] = useState(false);
  // Set after a successful reset — the temp password to surface + copy.
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* Toggle active */
  const [toggleUser, setToggleUser] = useState<OcmsCsUser | null>(null);

  async function handleCreate() {
    if (!newEmail.trim() || !newPassword || !newDisplayName.trim()) return;
    const id = newEmail.trim();
    if (id.length < 3 || /\s/.test(id)) {
      toast({
        type: "error",
        message: "Username must be at least 3 characters with no spaces",
      });
      return;
    }
    if (newPassword.length < OCMS_MIN_PASSWORD_LENGTH) {
      toast({
        type: "error",
        message: `Password must be at least ${OCMS_MIN_PASSWORD_LENGTH} characters`,
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin-ocms/cs-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: id,
          password: newPassword,
          display_name: newDisplayName.trim(),
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewEmail("");
        setNewPassword("");
        setNewDisplayName("");
        toast({ type: "success", message: "CS account created" });
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          type: "error",
          message: data.message || "Failed to create CS account",
        });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  function openReset(user: OcmsCsUser) {
    setPwUser(user);
    setTempPassword(null);
    setCopied(false);
  }

  async function handleResetPassword() {
    if (!pwUser) return;
    setResetting(true);
    try {
      const res = await fetch(
        `/api/admin-ocms/cs-users/${pwUser.id}/reset-password`,
        { method: "POST" }
      );
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        const temp =
          (json?.data?.temp_password as string | undefined) ||
          OCMS_TEMP_PASSWORD;
        setTempPassword(temp);
        toast({ type: "success", message: "Password reset" });
        // The account's is_active/flags don't change in the table, but refresh
        // to reflect any server-side state.
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          type: "error",
          message: data.message || data.error || "Failed to reset password",
        });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setResetting(false);
    }
  }

  async function copyTemp() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ type: "error", message: "Could not copy — copy it manually" });
    }
  }

  async function handleToggleActive() {
    if (!toggleUser) return;
    try {
      const res = await fetch(`/api/admin-ocms/cs-users/${toggleUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !toggleUser.is_active }),
      });
      if (res.ok) {
        toast({
          type: "success",
          message: toggleUser.is_active
            ? "CS account deactivated"
            : "CS account activated",
        });
        router.refresh();
      } else {
        toast({ type: "error", message: "Failed to update CS account" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    }
  }

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.2)" as const,
  };

  const columns: Column<OcmsCsUser>[] = [
    { key: "display_name", label: "Name", sortable: true },
    { key: "email", label: "Username / Email" },
    {
      key: "is_active",
      label: "Status",
      render: (row) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString() : "—",
    },
    {
      key: "_actions",
      label: "",
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openReset(row);
            }}
            className="rounded px-2 py-1 text-xs hover:bg-white/5 transition-colors"
            style={{ color: "#99a1af" }}
          >
            Reset Password
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToggleUser(row);
            }}
            className="rounded px-2 py-1 text-xs hover:bg-white/5 transition-colors"
            style={{ color: row.is_active ? "#fb2c36" : "#00bc7d" }}
          >
            {row.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">CS Accounts</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black"
          style={{ backgroundColor: "#f0b100" }}
        >
          Create CS Account
        </button>
      </div>

      <DataTable
        columns={columns}
        data={initialUsers}
        emptyMessage="No CS accounts yet"
        searchPlaceholder="Search CS accounts..."
      />

      {/* Create dialog */}
      <FormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create CS Account"
        onSave={handleCreate}
        saving={saving}
      >
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Username / Email
          </label>
          <input
            type="text"
            placeholder="username or cs@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Display Name
          </label>
          <input
            type="text"
            placeholder="Jane Doe"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Password
          </label>
          <input
            type="password"
            placeholder={`Min ${OCMS_MIN_PASSWORD_LENGTH} characters`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>
      </FormDialog>

      {/* Reset password dialog — one click sets the shared temp password and
          forces a change on next login. */}
      {pwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setPwUser(null)}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #171717 0%, #000000 100%)",
              border: "1px solid rgba(208,135,0,0.3)",
              boxShadow:
                "0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(208,135,0,0.15)",
            }}
          >
            <div
              className="px-6 py-4"
              style={{ borderBottom: "1px solid rgba(208,135,0,0.2)" }}
            >
              <h2 className="font-bold text-lg" style={{ color: "#f0b100" }}>
                Reset Password: {pwUser.display_name || pwUser.email}
              </h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              {tempPassword ? (
                <>
                  <p className="text-sm" style={{ color: "#99a1af" }}>
                    Password reset. Share this temporary password with the CS
                    user — they will be required to set a new one at next login.
                  </p>
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg px-4 py-3"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.6)",
                      border: "1px solid rgba(208,135,0,0.3)",
                    }}
                  >
                    <code
                      className="font-mono text-base tracking-wide"
                      style={{ color: "#f0b100" }}
                    >
                      {tempPassword}
                    </code>
                    <button
                      onClick={copyTemp}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110"
                      style={{ backgroundColor: "#f0b100" }}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm" style={{ color: "#99a1af" }}>
                  This resets{" "}
                  <span className="text-white font-medium">
                    {pwUser.display_name || pwUser.email}
                  </span>{" "}
                  to a temporary password and forces them to choose a new one at
                  next login. Continue?
                </p>
              )}
            </div>

            <div
              className="flex items-center justify-end gap-3 px-6 py-4"
              style={{ borderTop: "1px solid rgba(208,135,0,0.2)" }}
            >
              <button
                onClick={() => setPwUser(null)}
                className="rounded-lg px-4 py-2 text-sm text-[#99a1af] hover:text-white transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                {tempPassword ? "Done" : "Cancel"}
              </button>
              {!tempPassword && (
                <button
                  onClick={handleResetPassword}
                  disabled={resetting}
                  className="rounded-lg px-6 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  style={{ backgroundColor: "#f0b100" }}
                >
                  {resetting ? "Resetting..." : "Reset Password"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toggle active confirm */}
      <ConfirmDialog
        open={!!toggleUser}
        onClose={() => setToggleUser(null)}
        onConfirm={handleToggleActive}
        title={toggleUser?.is_active ? "Deactivate CS Account" : "Activate CS Account"}
        message={
          toggleUser?.is_active
            ? `This will deactivate "${toggleUser?.display_name}". They will no longer be able to log in.`
            : `This will re-activate "${toggleUser?.display_name}" and allow them to log in again.`
        }
        confirmLabel={toggleUser?.is_active ? "Deactivate" : "Activate"}
        danger={!!toggleUser?.is_active}
      />
    </div>
  );
}
