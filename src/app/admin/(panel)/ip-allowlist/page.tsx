"use client";

import { useState } from "react";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import { useAdminQuery, invalidateAdminQuery } from "@/lib/admin-query";
import DataTable, { type Column } from "@/components/admin/ui/DataTable";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import FormDialog from "@/components/admin/ui/FormDialog";
import { useToast } from "@/lib/toast-context";
import { isApiOk, apiErrorMessage } from "@/lib/api-result";

/** Gate names the backend accepts. Must match proxy.ts ipGateSurface() and the
 *  ip_allowlist_surfaces_valid CHECK constraint. The OCMS partner portal is
 *  deliberately absent — its partner IPs rotate, so it is never IP-gated. */
const SURFACES = [
  { key: "admin", label: "Back office (/admin)" },
  { key: "studio", label: "Studio (/studio)" },
] as const;

interface IPEntry extends Record<string, unknown> {
  id: string;
  ip_address: string;
  label: string;
  surfaces: string[];
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export default function IPAllowlistPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<IPEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<IPEntry | null>(null);

  const [ip, setIp] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [surfaces, setSurfaces] = useState<string[]>(["admin"]);
  const [isActive, setIsActive] = useState(true);

  const {
    data: entriesData,
    loading,
    refreshing,
    refetch,
  } = useAdminQuery<IPEntry[] | { entries: IPEntry[] }>("/api/admin/ip-allowlist");
  // The route has returned both shapes over its life; accept either rather than
  // let a gate that controls panel access fail closed on a payload detail.
  const entries: IPEntry[] = Array.isArray(entriesData)
    ? entriesData
    : entriesData?.entries ?? [];

  const fetchEntries = () => {
    invalidateAdminQuery("/api/admin/ip-allowlist");
    refetch();
  };

  function resetForm() {
    setIp("");
    setLabel("");
    setNotes("");
    setSurfaces(["admin"]);
    setIsActive(true);
  }

  function openEdit(entry: IPEntry) {
    setEditing(entry);
    setIp(entry.ip_address);
    setLabel(entry.label);
    setNotes(entry.notes ?? "");
    setSurfaces(entry.surfaces ?? []);
    setIsActive(entry.is_active);
  }

  function toggleSurface(key: string) {
    setSurfaces((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );
  }

  async function save() {
    if (!label.trim()) {
      toast({ type: "error", message: "Give the entry an owner label" });
      return;
    }
    if (surfaces.length === 0) {
      toast({ type: "error", message: "Pick at least one surface" });
      return;
    }
    setSaving(true);
    try {
      // The address is immutable on edit (server-side too): changing it in place
      // would move access between machines under a single audit entry.
      const editingEntry = editing;
      const res = await fetch(
        editingEntry
          ? `/api/admin/ip-allowlist/${editingEntry.id}`
          : "/api/admin/ip-allowlist",
        {
          method: editingEntry ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingEntry
              ? { label: label.trim(), surfaces, notes, is_active: isActive }
              : {
                  ip_address: ip.trim(),
                  label: label.trim(),
                  surfaces,
                  notes,
                  is_active: isActive,
                },
          ),
        },
      );
      const json = await res.json().catch(() => null);
      if (isApiOk(res, json)) {
        toast({
          type: "success",
          message: editingEntry ? "Entry updated" : `${ip.trim()} added`,
        });
        setShowCreate(false);
        setEditing(null);
        resetForm();
        fetchEntries();
      } else {
        toast({ type: "error", message: apiErrorMessage(json, "Could not save") });
      }
    } catch {
      toast({ type: "error", message: "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(entry: IPEntry) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/ip-allowlist/${entry.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (isApiOk(res, json)) {
        toast({ type: "success", message: `${entry.ip_address} removed` });
        setConfirmDelete(null);
        fetchEntries();
      } else {
        toast({ type: "error", message: apiErrorMessage(json, "Could not remove") });
      }
    } catch {
      toast({ type: "error", message: "Could not remove" });
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<IPEntry>[] = [
    {
      key: "ip_address",
      label: "IP Address",
      sortable: true,
      render: (r) => (
        <span style={{ fontFamily: "ui-monospace, monospace" }}>{r.ip_address}</span>
      ),
    },
    { key: "label", label: "Belongs to", sortable: true },
    {
      key: "surfaces",
      label: "Can access",
      render: (r) => (
        <div className="flex gap-1 flex-wrap">
          {(r.surfaces ?? []).map((s) => (
            <span
              key={s}
              className="rounded px-2 py-0.5 text-xs"
              style={{
                backgroundColor: s === "admin" ? "rgba(240,177,0,0.14)" : "rgba(43,127,255,0.16)",
                color: s === "admin" ? "#f0b100" : "#7cb0ff",
                border: `1px solid ${s === "admin" ? "rgba(240,177,0,0.35)" : "rgba(43,127,255,0.4)"}`,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Active",
      render: (r) => <StatusBadge status={r.is_active ? "active" : "inactive"} />,
    },
    {
      key: "notes",
      label: "Notes",
      render: (r) => (
        <span style={{ color: "#6a7282" }}>{r.notes || "—"}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => openEdit(r)}
            className="rounded px-2 py-1 text-xs font-medium"
            style={{ backgroundColor: "#262626", color: "#d1d5db" }}
          >
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(r)}
            className="rounded px-2 py-1 text-xs font-medium"
            style={{ backgroundColor: "rgba(251,44,54,0.14)", color: "#ff6467" }}
          >
            Remove
          </button>
        </div>
      ),
    },
  ];

  const inputStyle = {
    backgroundColor: "#0a0a0a",
    border: "1px solid #262626",
  } as const;

  const form = (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
          IP address {editing && <span style={{ color: "#6a7282" }}>(cannot be changed)</span>}
        </label>
        <input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          disabled={Boolean(editing)}
          placeholder="112.201.70.116"
          className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
          style={{ ...inputStyle, fontFamily: "ui-monospace, monospace" }}
        />
        {!editing && (
          <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
            A single address. CIDR ranges are not supported — the gate matches
            addresses exactly, so a range would never match.
          </p>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
          Belongs to
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Studio 1 / Office / Nio"
          className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
          style={inputStyle}
        />
      </div>
      <div>
        <span className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
          Can access
        </span>
        <div className="space-y-1">
          {SURFACES.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={surfaces.includes(s.key)}
                onChange={() => toggleSurface(s.key)}
              />
              {s.label}
            </label>
          ))}
        </div>
        <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
          The OCMS partner portal is never IP-restricted — partner addresses
          rotate and gating it would lock them out.
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
          Notes (optional)
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
          style={inputStyle}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-white">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Active
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IP Allowlist</h1>
      <RefreshingHint show={refreshing && !loading} />
          <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
            Restricts who can reach the internal surfaces, enforced at the edge
            where the real browser IP is visible. Player traffic and the OCMS
            partner portal are never affected. Changes take up to a minute to
            propagate.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black"
          style={{ backgroundColor: "#f0b100" }}
        >
          Add IP
        </button>
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "rgba(240,177,0,0.06)",
          border: "1px solid rgba(240,177,0,0.25)",
        }}
      >
        <p className="text-xs" style={{ color: "#d1d5db" }}>
          <strong>Careful:</strong> removing or deactivating your own address can
          lock you out of this panel. The addresses in{" "}
          <code>BREAK_GLASS_IPS</code> and <code>PANEL_ALLOWED_IPS</code> are
          honoured even if the list here is wrong, so they are the way back in.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={entries}
        loading={loading}
        emptyMessage="No entries — the gate is running on the environment allowlist only."
        searchPlaceholder="Search IP, owner, notes..."
        onSearch={() => {}}
      />

      <FormDialog
        open={showCreate || Boolean(editing)}
        onClose={() => {
          setShowCreate(false);
          setEditing(null);
          resetForm();
        }}
        title={editing ? `Edit ${editing.ip_address}` : "Add IP to allowlist"}
        onSave={save}
        saving={saving}
      >
        {form}
      </FormDialog>

      <FormDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Remove from allowlist"
        onSave={() => confirmDelete && doDelete(confirmDelete)}
        saving={saving}
      >
        <p className="text-sm" style={{ color: "#d1d5db" }}>
          Remove <strong>{confirmDelete?.ip_address}</strong> ({confirmDelete?.label})?
          Anyone on that address loses access to{" "}
          {(confirmDelete?.surfaces ?? []).join(" and ")} unless it is also in the
          environment allowlist.
        </p>
      </FormDialog>
    </div>
  );
}
