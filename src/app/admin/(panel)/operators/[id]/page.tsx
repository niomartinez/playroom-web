"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

interface OperatorDetail {
  id: string;
  name: string;
  client_id: string;
  api_key?: string;
  wallet_url: string;
  wallet_mode: string;
  is_active: boolean;
  allowed_ips: string[];
  created_at: string;
  [key: string]: unknown;
}

export default function OperatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [operator, setOperator] = useState<OperatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Editable fields */
  const [name, setName] = useState("");
  const [walletUrl, setWalletUrl] = useState("");
  const [walletMode, setWalletMode] = useState("seamless");
  const [isActive, setIsActive] = useState(true);
  const [allowedIps, setAllowedIps] = useState("");

  /* Confirm dialogs */
  const [showRegenKey, setShowRegenKey] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOperator = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/operators/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOperator(data);
        setName(data.name || "");
        setWalletUrl(data.wallet_url || "");
        setWalletMode(data.wallet_mode || "seamless");
        setIsActive(data.is_active ?? true);
        setAllowedIps(
          Array.isArray(data.allowed_ips)
            ? data.allowed_ips.join(", ")
            : data.allowed_ips || ""
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOperator();
  }, [fetchOperator]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/operators/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          wallet_url: walletUrl,
          wallet_mode: walletMode,
          is_active: isActive,
          allowed_ips: allowedIps
            .split(",")
            .map((ip) => ip.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        fetchOperator();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `Failed to save (${res.status})`);
      }
    } catch {
      setError("Network error — check your connection");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenKey() {
    try {
      const res = await fetch(`/api/admin/operators/${id}/regenerate-key`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setNewApiKey(data.api_key || data.key || null);
        fetchOperator();
      }
    } catch {
      // silent
    }
  }

  async function handleDeactivate() {
    try {
      const res = await fetch(`/api/admin/operators/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/operators");
      }
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>Loading operator...</span>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>Operator not found</span>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.2)" as const,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/operators")}
        className="flex items-center gap-1 text-sm hover:underline"
        style={{ color: "#99a1af" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Operators
      </button>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{operator.name}</h1>
        <StatusBadge status={operator.is_active ? "active" : "inactive"} />
      </div>

      {/* Info card */}
      <div
        className="rounded-xl p-6 space-y-1"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span style={{ color: "#6a7282" }}>Client ID</span>
            <p className="text-white font-mono mt-0.5">
              {operator.client_id || "\u2014"}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Created</span>
            <p className="text-white mt-0.5">
              {operator.created_at
                ? new Date(operator.created_at).toLocaleString()
                : "\u2014"}
            </p>
          </div>
        </div>
      </div>

      {/* New API Key display */}
      {newApiKey && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "rgba(5,223,114,0.08)",
            border: "1px solid rgba(5,223,114,0.3)",
          }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "#05df72" }}>
            New API Key (copy now, it will not be shown again):
          </p>
          <code className="text-sm text-white font-mono break-all">
            {newApiKey}
          </code>
        </div>
      )}

      {/* Edit form */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "#d08700" }}
        >
          Edit Operator
        </h2>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Wallet URL
          </label>
          <input
            type="url"
            value={walletUrl}
            onChange={(e) => setWalletUrl(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Wallet Mode
          </label>
          <select
            value={walletMode}
            onChange={(e) => setWalletMode(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          >
            <option value="seamless">Seamless</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "#99a1af" }}
          >
            Allowed IPs (comma-separated)
          </label>
          <input
            type="text"
            placeholder="1.2.3.4, 5.6.7.8"
            value={allowedIps}
            onChange={(e) => setAllowedIps(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>

        <div className="flex items-center justify-between">
          <label
            className="text-xs font-medium"
            style={{ color: "#99a1af" }}
          >
            Active
          </label>
          <button
            onClick={() => setIsActive(!isActive)}
            className="relative rounded-full transition-colors"
            style={{
              width: 44,
              height: 24,
              backgroundColor: isActive
                ? "rgba(208,135,0,0.5)"
                : "rgba(255,255,255,0.1)",
            }}
          >
            <span
              className="absolute top-0.5 rounded-full transition-transform bg-white"
              style={{
                width: 20,
                height: 20,
                left: isActive ? 22 : 2,
              }}
            />
          </button>
        </div>

        {error && (
          <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "rgba(251,44,54,0.1)", color: "#fb2c36", border: "1px solid rgba(251,44,54,0.3)" }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg px-6 py-2 text-sm font-semibold text-black disabled:opacity-50"
            style={{ backgroundColor: "#f0b100" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(251,44,54,0.2)",
        }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "#fb2c36" }}
        >
          Danger Zone
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setShowRegenKey(true)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "rgba(240,177,0,0.1)",
              color: "#f0b100",
              border: "1px solid rgba(240,177,0,0.3)",
            }}
          >
            Regenerate API Key
          </button>
          <button
            onClick={() => setShowDeactivate(true)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "rgba(251,44,54,0.1)",
              color: "#fb2c36",
              border: "1px solid rgba(251,44,54,0.3)",
            }}
          >
            Deactivate Operator
          </button>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={showRegenKey}
        onClose={() => setShowRegenKey(false)}
        onConfirm={handleRegenKey}
        title="Regenerate API Key"
        message="This will invalidate the current API key. The operator will need to update their integration with the new key. This action cannot be undone."
        confirmLabel="Regenerate"
        danger
      />
      <ConfirmDialog
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Operator"
        message="This will deactivate the operator. All their active sessions and integrations will stop working. You can reactivate later."
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
