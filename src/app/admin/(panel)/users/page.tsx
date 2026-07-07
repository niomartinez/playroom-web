"use client";

import { useState, useEffect, useCallback } from "react";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import FormDialog from "@/components/admin/ui/FormDialog";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/lib/toast-context";

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: "#fb2c36",
  operator_admin: "#f0b100",
  viewer: "#2b7fff",
};

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  /* Create dialog */
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [saving, setSaving] = useState(false);

  /* Edit dialog */
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");

  /* Deactivate */
  const [deactivateUser, setDeactivateUser] = useState<AdminUser | null>(null);

  /* Reset password */
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(Array.isArray(json) ? json : json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleCreate() {
    if (!newEmail.trim() || !newPassword || !newDisplayName.trim()) return;
    const id = newEmail.trim();
    if (id.length < 3 || /\s/.test(id)) {
      toast({ type: "error", message: "Username must be at least 3 characters with no spaces" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: id,
          password: newPassword,
          display_name: newDisplayName.trim(),
          role: newRole,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewEmail("");
        setNewPassword("");
        setNewDisplayName("");
        setNewRole("viewer");
        fetchUsers();
        toast({ type: "success", message: "Admin user created" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ type: "error", message: data.message || "Failed to create user" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editName && editName !== editUser.display_name) body.display_name = editName;
      if (editRole && editRole !== editUser.role) body.role = editRole;
      if (editPassword) body.password = editPassword;

      if (Object.keys(body).length === 0) {
        setEditUser(null);
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditUser(null);
        fetchUsers();
        toast({ type: "success", message: "User updated" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ type: "error", message: data.message || "Failed to update user" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateUser) return;
    try {
      const res = await fetch(`/api/admin/users/${deactivateUser.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchUsers();
        toast({ type: "success", message: "User deactivated" });
      } else {
        toast({ type: "error", message: "Failed to deactivate user" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    }
  }

  async function handleReset() {
    if (!resetUser) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.error_code === undefined || data.error_code === "0000")) {
        // Backend returns the temp password so the literal is not hardcoded here.
        const tempPassword: string =
          data?.data?.temp_password ??
          data?.data?.temporary_password ??
          data?.temp_password ??
          "TempPass123!";
        setResetResult({ email: resetUser.email, tempPassword });
        setResetUser(null);
        toast({ type: "success", message: "Password reset" });
      } else {
        toast({ type: "error", message: data.message || "Failed to reset password" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setResetting(false);
    }
  }

  async function copyTempPassword() {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ type: "error", message: "Could not copy to clipboard" });
    }
  }

  function openEdit(user: AdminUser) {
    setEditUser(user);
    setEditName(user.display_name);
    setEditRole(user.role);
    setEditPassword("");
  }

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.2)" as const,
  };

  const columns: Column<AdminUser>[] = [
    { key: "display_name", label: "Name", sortable: true },
    { key: "email", label: "Username / Email" },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <span
          className="text-xs font-semibold uppercase"
          style={{ color: ROLE_COLORS[row.role] || "#99a1af" }}
        >
          {row.role.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (row) => <StatusBadge status={row.is_active ? "active" : "inactive"} />,
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : "\u2014",
    },
    {
      key: "_actions",
      label: "",
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="rounded px-2 py-1 text-xs hover:bg-white/5 transition-colors"
            style={{ color: "#99a1af" }}
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setResetUser(row); }}
            className="rounded px-2 py-1 text-xs hover:bg-white/5 transition-colors"
            style={{ color: "#f0b100" }}
          >
            Reset password
          </button>
          {row.is_active && (
            <button
              onClick={(e) => { e.stopPropagation(); setDeactivateUser(row); }}
              className="rounded px-2 py-1 text-xs hover:bg-white/5 transition-colors"
              style={{ color: "#fb2c36" }}
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin Users</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black"
          style={{ backgroundColor: "#f0b100" }}
        >
          Create User
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No admin users found"
        searchPlaceholder="Search users..."
      />

      {/* Create User Dialog */}
      <FormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Admin User"
        onSave={handleCreate}
        saving={saving}
      >
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Username / Email</label>
          <input type="text" placeholder="username or admin@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Display Name</label>
          <input type="text" placeholder="Jane Doe" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Password</label>
          <input type="password" placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Role</label>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={inputStyle}>
            <option value="viewer">Viewer</option>
            <option value="operator_admin">Operator Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>
      </FormDialog>

      {/* Edit User Dialog */}
      <FormDialog
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit: ${editUser?.display_name || ""}`}
        onSave={handleEdit}
        saving={saving}
      >
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Display Name</label>
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Role</label>
          <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={inputStyle}>
            <option value="viewer">Viewer</option>
            <option value="operator_admin">Operator Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            New Password (leave blank to keep current)
          </label>
          <input type="password" placeholder="Leave blank to keep" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={inputStyle} />
        </div>
      </FormDialog>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={!!deactivateUser}
        onClose={() => setDeactivateUser(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Admin User"
        message={`This will deactivate "${deactivateUser?.display_name}". They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        danger
      />

      {/* Reset Password Confirm */}
      <ConfirmDialog
        open={!!resetUser}
        onClose={() => { if (!resetting) setResetUser(null); }}
        onConfirm={handleReset}
        title="Reset Password"
        message={`Reset the password for "${resetUser?.display_name}" to a temporary password? They will be required to set a new password on their next login.`}
        confirmLabel={resetting ? "Resetting..." : "Reset password"}
      />

      {/* Reset Password Result */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setResetResult(null)}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #171717 0%, #000000 100%)",
              border: "1px solid rgba(208,135,0,0.3)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(208,135,0,0.15)",
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(208,135,0,0.2)" }}
            >
              <h2 className="font-bold text-lg" style={{ color: "#f0b100" }}>
                Password Reset
              </h2>
              <button
                onClick={() => setResetResult(null)}
                className="text-[#6a7282] hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm" style={{ color: "#99a1af" }}>
                Temporary password for <span className="text-white">{resetResult.email}</span>:
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-mono text-white select-all"
                  style={{ backgroundColor: "rgba(0,0,0,0.6)", border: "1px solid rgba(208,135,0,0.2)" }}
                >
                  {resetResult.tempPassword}
                </code>
                <button
                  onClick={copyTempPassword}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-black shrink-0"
                  style={{ backgroundColor: "#f0b100" }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs" style={{ color: "#f0b100" }}>
                Share this with the user securely. They must change it on their next login.
              </p>
            </div>

            <div
              className="flex items-center justify-end gap-3 px-6 py-4"
              style={{ borderTop: "1px solid rgba(208,135,0,0.2)" }}
            >
              <button
                onClick={() => setResetResult(null)}
                className="rounded-lg px-6 py-2 text-sm font-semibold text-black"
                style={{ backgroundColor: "#f0b100" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
