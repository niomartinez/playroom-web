"use client";

import { useState, useEffect, useCallback } from "react";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";

interface ConfigEntry {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

const BET_CODE_LABELS: Record<string, string> = {
  BAC_Banker: "Banker",
  BAC_Player: "Player",
  BAC_Tie: "Tie",
  BAC_PlayerPair: "Player Pair",
  BAC_BankerPair: "Banker Pair",
  BAC_EitherPair: "Either Pair",
  BAC_SuperSix: "Super Six",
  BAC_PlayerBonus: "Player Bonus",
  BAC_BankerBonus: "Banker Bonus",
  BAC_Dragon7: "Dragon 7",
  BAC_Panda8: "Panda 8",
  BAC_Lucky6: "Lucky 6",
  BAC_Lucky7: "Lucky 7",
  BAC_BigTiger: "Big Tiger",
  BAC_SmallTiger: "Small Tiger",
};

export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  /* Editable state */
  const [bettingTime, setBettingTime] = useState("15");
  const [currencies, setCurrencies] = useState("PHP");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [odds, setOdds] = useState<Record<string, string>>({});

  /* Danger zone */
  const [showForceClose, setShowForceClose] = useState(false);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const json = await res.json();
        const entries: ConfigEntry[] = json.data ?? json ?? [];
        setConfig(entries);

        for (const entry of entries) {
          const val = typeof entry.value === "string"
            ? tryParse(entry.value)
            : entry.value;

          switch (entry.key) {
            case "default_betting_time":
              setBettingTime(String(val));
              break;
            case "supported_currencies":
              setCurrencies(
                Array.isArray(val) ? val.join(", ") : String(val)
              );
              break;
            case "maintenance_mode":
              setMaintenanceMode(val === true || val === "true");
              break;
            case "baccarat_odds":
              if (typeof val === "object" && val !== null) {
                const o: Record<string, string> = {};
                for (const [k, v] of Object.entries(val as Record<string, number>)) {
                  o[k] = String(v);
                }
                setOdds(o);
              }
              break;
          }
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  function tryParse(s: string): unknown {
    try { return JSON.parse(s); } catch { return s; }
  }

  async function saveKey(key: string, value: unknown) {
    setSaving(key);
    try {
      await fetch(`/api/admin/config/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      fetchConfig();
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleMaintenance() {
    const newVal = !maintenanceMode;
    setMaintenanceMode(newVal);
    await saveKey("maintenance_mode", newVal);
    setActionResult(
      newVal ? "Maintenance mode ENABLED — non-internal endpoints return 503" : "Maintenance mode disabled"
    );
  }

  async function handleForceClose() {
    try {
      const res = await fetch("/api/admin/config/force-close-tables", {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setActionResult(`Force-closed ${data.tables_closed ?? 0} table(s)`);
      }
    } catch {
      // silent
    }
  }

  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)" as const,
    border: "1px solid rgba(208,135,0,0.2)" as const,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {actionResult && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "rgba(240,177,0,0.08)",
            border: "1px solid rgba(240,177,0,0.3)",
          }}
        >
          <p className="text-sm" style={{ color: "#f0b100" }}>{actionResult}</p>
        </div>
      )}

      {/* General settings */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d08700" }}>
          General
        </h2>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Default Betting Time (seconds)
          </label>
          <div className="flex gap-2">
            <input
              type="number" min={5} max={60}
              value={bettingTime}
              onChange={(e) => setBettingTime(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
            <button
              onClick={() => saveKey("default_betting_time", parseInt(bettingTime) || 15)}
              disabled={saving === "default_betting_time"}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              style={{ backgroundColor: "#f0b100" }}
            >
              {saving === "default_betting_time" ? "..." : "Save"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Supported Currencies (comma-separated)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={currencies}
              onChange={(e) => setCurrencies(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
            <button
              onClick={() =>
                saveKey(
                  "supported_currencies",
                  currencies.split(",").map((c) => c.trim()).filter(Boolean)
                )
              }
              disabled={saving === "supported_currencies"}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              style={{ backgroundColor: "#f0b100" }}
            >
              {saving === "supported_currencies" ? "..." : "Save"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <label className="text-xs font-medium" style={{ color: "#99a1af" }}>
              Maintenance Mode
            </label>
            <p className="text-xs mt-0.5" style={{ color: "#6a7282" }}>
              Returns 503 for all non-internal endpoints
            </p>
          </div>
          <button
            onClick={() => {
              if (!maintenanceMode) {
                setShowMaintenanceConfirm(true);
              } else {
                handleToggleMaintenance();
              }
            }}
            className="relative rounded-full transition-colors"
            style={{
              width: 44, height: 24,
              backgroundColor: maintenanceMode ? "rgba(251,44,54,0.5)" : "rgba(255,255,255,0.1)",
            }}
          >
            <span
              className="absolute top-0.5 rounded-full transition-transform bg-white"
              style={{ width: 20, height: 20, left: maintenanceMode ? 22 : 2 }}
            />
          </button>
        </div>
      </div>

      {/* Payout Odds */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d08700" }}>
          Payout Odds
        </h2>

        <div className="space-y-2">
          {Object.entries(odds).map(([code, val]) => (
            <div key={code} className="flex items-center gap-3">
              <span className="text-sm text-white w-36 shrink-0">
                {BET_CODE_LABELS[code] || code}
              </span>
              <input
                type="number" step="0.01" min="0"
                value={val}
                onChange={(e) => setOdds({ ...odds, [code]: e.target.value })}
                className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white outline-none font-mono"
                style={inputStyle}
              />
              <span className="text-xs" style={{ color: "#6a7282" }}>x</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            const numericOdds: Record<string, number> = {};
            for (const [k, v] of Object.entries(odds)) {
              numericOdds[k] = parseFloat(v) || 0;
            }
            saveKey("baccarat_odds", numericOdds);
          }}
          disabled={saving === "baccarat_odds"}
          className="rounded-lg px-6 py-2 text-sm font-semibold text-black disabled:opacity-50"
          style={{ backgroundColor: "#f0b100" }}
        >
          {saving === "baccarat_odds" ? "Saving..." : "Save Odds"}
        </button>
      </div>

      {/* Danger Zone */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(251,44,54,0.2)" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#fb2c36" }}>
          Danger Zone
        </h2>

        <button
          onClick={() => setShowForceClose(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "rgba(251,44,54,0.1)",
            color: "#fb2c36",
            border: "1px solid rgba(251,44,54,0.3)",
          }}
        >
          Force-Close All Tables
        </button>
      </div>

      <ConfirmDialog
        open={showForceClose}
        onClose={() => setShowForceClose(false)}
        onConfirm={handleForceClose}
        title="Force-Close All Tables"
        message="This will immediately close ALL active tables and disconnect all players. This action cannot be undone."
        confirmLabel="Close All Tables"
        danger
      />

      <ConfirmDialog
        open={showMaintenanceConfirm}
        onClose={() => setShowMaintenanceConfirm(false)}
        onConfirm={handleToggleMaintenance}
        title="Enable Maintenance Mode"
        message="All non-internal API endpoints will return 503. Players and operators will be unable to use the platform until maintenance mode is disabled."
        confirmLabel="Enable"
        danger
      />
    </div>
  );
}
