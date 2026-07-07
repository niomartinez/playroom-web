"use client";

import { useState, useEffect, useCallback } from "react";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import FormDialog from "@/components/admin/ui/FormDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/lib/toast-context";
import { useOcms } from "@/lib/ocms-context";

interface CsUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

export default function OcmsCsUsersPage() {
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useOcms();
  const [users, setUsers] = useState<CsUser[]>([]);
  const [loading, setLoading] = useState(true);

  /* Create dialog */
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  /* Reset password dialog */
  const [pwUser, setPwUser] = useState<CsUser | null>(null);
  const [newPw, setNewPw] = useState("");

  /* Toggle active */
  const [toggleUser, setToggleUser] = useState<CsUser | null>(null);

  const isAdmin = currentUser?.role === "ocms_admin";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin-ocms/cs-users");
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setUsers(Array.isArray(data) ? data : data.users ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
    else setLoading(false);
  }, [isAdmin, fetchUsers]);

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
        fetchUsers();
        toast({ type: "success", message: "CS account created" });
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

  async function handleResetPassword() {
    if (!pwUser || !newPw) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin-ocms/cs-users/${pwUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPw }),
      });
      if (res.ok) {
        setPwUser(null);
        setNewPw("");
        toast({ type: "success", message: "Password reset" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          type: "error",
          message: data.message || "Failed to reset password",
        });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setSaving(false);
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
        fetchUsers();
        toast({
          type: "success",
          message: toggleUser.is_active ? "CS account deactivated" : "CS account activated",
        });
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

  const columns: Column<CsUser>[] = [
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
              setPwUser(row);
              setNewPw("");
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

  if (!authLoading && !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>
          You do not have access to CS account management.
        </span>
      </div>
    );
  }

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
        data={users}
        loading={loading}
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
            placeholder="Min 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>
      </FormDialog>

      {/* Reset password dialog */}
      <FormDialog
        open={!!pwUser}
        onClose={() => setPwUser(null)}
        title={`Reset Password: ${pwUser?.display_name || ""}`}
        onSave={handleResetPassword}
        saving={saving}
      >
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            New Password
          </label>
          <input
            type="password"
            placeholder="Min 8 characters"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>
      </FormDialog>

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
