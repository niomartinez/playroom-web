"use client";

import { useState, useEffect, useCallback } from "react";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  admin_display_name: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "#00bc7d",
  update: "#f0b100",
  soft_delete: "#fb2c36",
  deactivate: "#fb2c36",
  void_round: "#fb2c36",
  kick_player: "#fb2c36",
  regenerate_api_key: "#f0b100",
  update_config: "#2b7fff",
  force_close_all_tables: "#fb2c36",
  create_admin_user: "#00bc7d",
  update_admin_user: "#f0b100",
  deactivate_admin_user: "#fb2c36",
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  /* Filters */
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (filterAction) params.set("action", filterAction);
      if (filterEntity) params.set("entity_type", filterEntity);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterEntity]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.15)" as const,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Audit Log</h1>

      {/* Filters */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Action</label>
            <input
              type="text"
              placeholder="e.g. update, soft_delete"
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>Entity Type</label>
            <select
              value={filterEntity}
              onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            >
              <option value="">All</option>
              <option value="operator">Operator</option>
              <option value="table">Table</option>
              <option value="round">Round</option>
              <option value="player">Player</option>
              <option value="system_config">Config</option>
              <option value="admin_user">Admin User</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        {loading ? (
          <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>No audit entries found</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="px-6 py-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold uppercase px-2 py-0.5 rounded"
                      style={{
                        color: ACTION_COLORS[entry.action] || "#99a1af",
                        backgroundColor: `${ACTION_COLORS[entry.action] || "#99a1af"}15`,
                      }}
                    >
                      {entry.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm text-white">{entry.entity_type}</span>
                    {entry.entity_id && (
                      <span className="text-xs font-mono" style={{ color: "#6a7282" }}>
                        {entry.entity_id.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: "#6a7282" }}>
                    <span>{entry.admin_display_name || entry.admin_email}</span>
                    <span>{new Date(entry.created_at).toLocaleString()}</span>
                    <span className="font-mono">{entry.ip_address}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === entry.id && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    {entry.old_value && (
                      <div>
                        <span className="text-xs font-medium" style={{ color: "#fb2c36" }}>Old Value</span>
                        <pre
                          className="mt-1 text-xs font-mono rounded-lg p-3 overflow-x-auto"
                          style={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#99a1af" }}
                        >
                          {JSON.stringify(entry.old_value, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.new_value && (
                      <div>
                        <span className="text-xs font-medium" style={{ color: "#00bc7d" }}>New Value</span>
                        <pre
                          className="mt-1 text-xs font-mono rounded-lg p-3 overflow-x-auto"
                          style={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#99a1af" }}
                        >
                          {JSON.stringify(entry.new_value, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 text-xs"
            style={{ borderTop: "1px solid rgba(208,135,0,0.1)", color: "#6a7282" }}
          >
            <span>Page {page} of {totalPages} ({total} entries)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5" style={{ color: "#99a1af" }}>Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5" style={{ color: "#99a1af" }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
