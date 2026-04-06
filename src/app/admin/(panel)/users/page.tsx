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
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
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
    { key: "email", label: "Email" },
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
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Email</label>
          <input type="email" placeholder="admin@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
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
    </div>
  );
}
