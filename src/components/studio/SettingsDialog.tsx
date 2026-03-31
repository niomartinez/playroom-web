"use client";

import { useState, useEffect, useCallback } from "react";
import { useStudio } from "@/lib/studio-context";
import { clientFetch } from "@/lib/api";

interface TableOption {
  id: string;
  name: string;
  min_bet?: number;
  max_bet?: number;
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const studio = useStudio();

  /* ---- Local form state ---- */
  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedTableId, setSelectedTableId] = useState(studio.tableId);
  const [selectedTableName, setSelectedTableName] = useState(studio.tableName);
  const [dealerName, setDealerName] = useState(studio.dealerName);
  const [lang, setLang] = useState(studio.lang);
  const [soundEnabled, setSoundEnabled] = useState(studio.soundEnabled);
  const [loading, setLoading] = useState(false);

  /* ---- New table form ---- */
  const [showNewTable, setShowNewTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newMinBet, setNewMinBet] = useState("20");
  const [newMaxBet, setNewMaxBet] = useState("50000");
  const [creating, setCreating] = useState(false);

  /* ---- Fetch tables on open ---- */
  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientFetch("/api/emulator/tables");
      const list = Array.isArray(data) ? data : data.tables ?? [];
      setTables(list);
    } catch {
      // silently fail; user sees empty list
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTables();
      // Reset local state to current context values
      setSelectedTableId(studio.tableId);
      setSelectedTableName(studio.tableName);
      setDealerName(studio.dealerName);
      setLang(studio.lang);
      setSoundEnabled(studio.soundEnabled);
    }
  }, [open, studio.tableId, studio.tableName, studio.dealerName, studio.lang, studio.soundEnabled, fetchTables]);

  /* ---- Create new table ---- */
  const handleCreateTable = async () => {
    if (!newTableName.trim()) return;
    setCreating(true);
    try {
      const data = await clientFetch("/api/studio/table", {
        method: "POST",
        body: JSON.stringify({
          name: newTableName.trim(),
          min_bet: Number(newMinBet) || 20,
          max_bet: Number(newMaxBet) || 50000,
        }),
      });
      // Add to list and select it
      const created: TableOption = {
        id: data.id ?? data.table_id ?? "",
        name: data.name ?? newTableName.trim(),
        min_bet: Number(newMinBet) || 20,
        max_bet: Number(newMaxBet) || 50000,
      };
      setTables((prev) => [...prev, created]);
      setSelectedTableId(created.id);
      setSelectedTableName(created.name);
      setNewTableName("");
      setShowNewTable(false);
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  /* ---- Save ---- */
  const handleSave = () => {
    // Persist to localStorage
    localStorage.setItem("selectedTableId", selectedTableId);
    localStorage.setItem("selectedTableName", selectedTableName);
    localStorage.setItem("dealerName", dealerName);
    localStorage.setItem("studioLang", lang);
    localStorage.setItem("studioSound", soundEnabled ? "on" : "off");

    // Update studio context
    studio.setTableId(selectedTableId);
    studio.setTableName(selectedTableName);
    studio.setDealerName(dealerName);
    studio.setLang(lang);
    studio.setSoundEnabled(soundEnabled);

    onClose();
  };

  /* ---- Table selection change ---- */
  const handleTableChange = (id: string) => {
    setSelectedTableId(id);
    const found = tables.find((t) => t.id === id);
    setSelectedTableName(found?.name ?? "");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #171717 0%, #000000 100%)",
          border: "1px solid rgba(208,135,0,0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(208,135,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(208,135,0,0.2)" }}
        >
          <h2 className="font-bold text-lg" style={{ color: "#f0b100" }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-[#6a7282] hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Table Selector */}
          <div>
            <label className="block text-xs font-medium text-[#99a1af] mb-1">
              Table
            </label>
            <select
              value={selectedTableId}
              onChange={(e) => handleTableChange(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(208,135,0,0.2)",
              }}
            >
              <option value="">
                {loading ? "Loading tables..." : "Select a table"}
              </option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {selectedTableName && (
              <p className="text-xs text-[#6a7282] mt-1">
                Selected: <span className="text-white">{selectedTableName}</span>
              </p>
            )}
          </div>

          {/* Create New Table */}
          <div>
            {!showNewTable ? (
              <button
                onClick={() => setShowNewTable(true)}
                className="text-xs font-medium hover:underline"
                style={{ color: "#f0b100" }}
              >
                + Create new table
              </button>
            ) : (
              <div
                className="rounded-lg p-3 space-y-2"
                style={{
                  backgroundColor: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(208,135,0,0.15)",
                }}
              >
                <p className="text-xs font-medium text-[#99a1af]">New Table</p>
                <input
                  type="text"
                  placeholder="Table name"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full rounded px-3 py-1.5 text-sm text-white outline-none"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.6)",
                    border: "1px solid rgba(208,135,0,0.15)",
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min bet"
                    value={newMinBet}
                    onChange={(e) => setNewMinBet(e.target.value)}
                    className="rounded px-3 py-1.5 text-sm text-white outline-none"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.6)",
                      border: "1px solid rgba(208,135,0,0.15)",
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Max bet"
                    value={newMaxBet}
                    onChange={(e) => setNewMaxBet(e.target.value)}
                    className="rounded px-3 py-1.5 text-sm text-white outline-none"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.6)",
                      border: "1px solid rgba(208,135,0,0.15)",
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTable}
                    disabled={creating || !newTableName.trim()}
                    className="rounded px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
                    style={{ backgroundColor: "#f0b100" }}
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                  <button
                    onClick={() => setShowNewTable(false)}
                    className="rounded px-3 py-1.5 text-xs text-[#99a1af] hover:text-white"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dealer Name */}
          <div>
            <label className="block text-xs font-medium text-[#99a1af] mb-1">
              Dealer Name
            </label>
            <input
              type="text"
              placeholder="Enter dealer name"
              value={dealerName}
              onChange={(e) => setDealerName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(208,135,0,0.2)",
              }}
            />
          </div>

          {/* Language Toggle */}
          <div>
            <label className="block text-xs font-medium text-[#99a1af] mb-1">
              Language
            </label>
            <div className="flex gap-2">
              {(["EN", "ZH_TW"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: lang === l ? "rgba(208,135,0,0.25)" : "rgba(0,0,0,0.4)",
                    border: `1px solid ${lang === l ? "rgba(208,135,0,0.5)" : "rgba(255,255,255,0.08)"}`,
                    color: lang === l ? "#f0b100" : "#6a7282",
                  }}
                >
                  {l === "EN" ? "English" : "繁體中文"}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#99a1af]">Sound</label>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="relative rounded-full transition-colors"
              style={{
                width: 44,
                height: 24,
                backgroundColor: soundEnabled ? "rgba(208,135,0,0.5)" : "rgba(255,255,255,0.1)",
              }}
            >
              <span
                className="absolute top-0.5 rounded-full transition-transform bg-white"
                style={{
                  width: 20,
                  height: 20,
                  left: soundEnabled ? 22 : 2,
                }}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid rgba(208,135,0,0.2)" }}
        >
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[#99a1af] hover:text-white transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg px-6 py-2 text-sm font-semibold text-black"
            style={{ backgroundColor: "#f0b100" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
