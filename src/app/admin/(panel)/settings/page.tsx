"use client";

import { useState, useEffect, useRef } from "react";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import { useAdminQuery, invalidateAdminQuery } from "@/lib/admin-query";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/lib/toast-context";

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
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  /* Editable state */
  const [bettingTime, setBettingTime] = useState("15");
  const [currencies, setCurrencies] = useState("PHP");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [liveChatEnabled, setLiveChatEnabled] = useState(false);
  const [odds, setOdds] = useState<Record<string, string>>({});

  // Inactivity / idle-session policy (rounds). expire = freeze after N idle
  // rounds; warn1/warn2 = optional escalating warnings before that. Empty
  // string = disabled (null).
  const [idleExpire, setIdleExpire] = useState("3");
  const [idleWarn1, setIdleWarn1] = useState("1");
  const [idleWarn2, setIdleWarn2] = useState("2");

  // Minimum seat balance — `enter` to sit down, `block` to keep the seat after
  // each settlement, `warn` for the soft low-balance nudge. Defaults mirror the
  // backend (config_cache._MIN_SEAT_BALANCE_DEFAULT) so an unsaved form never
  // implies different numbers than the server is actually enforcing.
  const [seatEnter, setSeatEnter] = useState("1000");
  const [seatBlock, setSeatBlock] = useState("1000");
  const [seatWarn, setSeatWarn] = useState("2000");

  /* Minimum wagered before a player may use live chat. 0 = off. */
  const [chatMinWager, setChatMinWager] = useState("500");

  /* Danger zone */
  const [showForceClose, setShowForceClose] = useState(false);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const {
    data: configData,
    loading,
    refreshing,
    refetch,
  } = useAdminQuery<ConfigEntry[]>("/api/admin/config");
  const config = configData ?? [];

  const fetchConfig = () => {
    invalidateAdminQuery("/api/admin/config");
    refetch();
  };

  /* Seed the form ONCE.
   *
   * Settings is cached and revalidates in the background, and every field here
   * is an input someone may be part-way through changing. Re-running the
   * seeding on each data change would discard those edits the moment a refresh
   * landed — on the page that sets bet limits and maintenance mode. Guarded by
   * a ref rather than a dependency list because that is the actual rule: seed
   * from the first payload, never again. */
  const seeded = useRef(false);
  useEffect(() => {
    if (!configData || seeded.current) return;
    seeded.current = true;
    {
      {
        const entries: ConfigEntry[] = configData;
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
            case "live_chat_enabled":
              setLiveChatEnabled(val === true || val === "true");
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
            case "player_idle_policy":
              if (typeof val === "object" && val !== null) {
                const p = val as { expire?: number; warn1?: number | null; warn2?: number | null };
                if (p.expire != null) setIdleExpire(String(p.expire));
                setIdleWarn1(p.warn1 != null ? String(p.warn1) : "");
                setIdleWarn2(p.warn2 != null ? String(p.warn2) : "");
              }
              break;
            case "chat_min_wager":
              if (typeof val === "number" || typeof val === "string") {
                setChatMinWager(String(val));
              }
              break;
            case "min_seat_balance":
              if (typeof val === "object" && val !== null) {
                const s = val as { enter?: number; block?: number; warn?: number };
                if (s.block != null) setSeatBlock(String(s.block));
                if (s.warn != null) setSeatWarn(String(s.warn));
                // Configs saved before `enter` existed only carry block/warn.
                // Mirror the backend's back-compat rule (enter falls back to
                // block) so the form shows what is actually being enforced.
                if (s.enter != null) setSeatEnter(String(s.enter));
                else if (s.block != null) setSeatEnter(String(s.block));
              }
              break;
          }
        }
      }
    }
  }, [configData]);

  function tryParse(s: string): unknown {
    try { return JSON.parse(s); } catch { return s; }
  }

  async function saveKey(key: string, value: unknown) {
    setSaving(key);
    try {
      const res = await fetch(`/api/admin/config/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        fetchConfig();
        toast({ type: "success", message: `Setting "${key.replace(/_/g, " ")}" saved` });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ type: "error", message: data.message || "Failed to save setting" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    } finally {
      setSaving(null);
    }
  }

  async function handleToggleLiveChat() {
    const newVal = !liveChatEnabled;
    setLiveChatEnabled(newVal);
    await saveKey("live_chat_enabled", newVal);
    toast({
      type: newVal ? "success" : "info",
      message: newVal ? "Live Chat enabled for players" : "Live Chat hidden from players",
    });
  }

  async function handleToggleMaintenance() {
    const newVal = !maintenanceMode;
    setMaintenanceMode(newVal);
    await saveKey("maintenance_mode", newVal);
    const msg = newVal
      ? "Maintenance mode ENABLED"
      : "Maintenance mode disabled";
    setActionResult(
      newVal ? "Maintenance mode ENABLED — non-internal endpoints return 503" : "Maintenance mode disabled"
    );
    toast({ type: newVal ? "info" : "success", message: msg });
  }

  async function handleForceClose() {
    try {
      const res = await fetch("/api/admin/config/force-close-tables", {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        const msg = `Force-closed ${data.tables_closed ?? 0} table(s)`;
        setActionResult(msg);
        toast({ type: "success", message: msg });
      } else {
        toast({ type: "error", message: "Failed to force-close tables" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
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
      <RefreshingHint show={refreshing && !loading} />

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
              Live Chat (Player UI)
            </label>
            <p className="text-xs mt-0.5" style={{ color: "#6a7282" }}>
              Show the Live Chat panel and button in the player interface
            </p>
          </div>
          <button
            onClick={handleToggleLiveChat}
            disabled={saving === "live_chat_enabled"}
            className="relative rounded-full transition-colors disabled:opacity-50"
            style={{
              width: 44, height: 24,
              backgroundColor: liveChatEnabled ? "rgba(5,223,114,0.6)" : "rgba(255,255,255,0.1)",
            }}
          >
            <span
              className="absolute top-0.5 rounded-full transition-transform bg-white"
              style={{ width: 20, height: 20, left: liveChatEnabled ? 22 : 2 }}
            />
          </button>
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

      {/* Inactivity / idle-session policy */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d08700" }}>
            Inactivity (platform default)
          </h2>
          <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
            A player who sits out (places no bet) for this many rounds is frozen
            with a &ldquo;seat released&rdquo; overlay. Warnings are optional and must be
            fewer rounds than the freeze. This is the default for operators that
            haven&rsquo;t set their own — override it per operator on the operator
            page. Takes effect on the next round after Save.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Freeze after (idle rounds)
            </label>
            <input
              type="number" min={1} max={50}
              value={idleExpire}
              onChange={(e) => setIdleExpire(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              1st warning at (blank = off)
            </label>
            <input
              type="number" min={1} max={49}
              value={idleWarn1}
              onChange={(e) => setIdleWarn1(e.target.value)}
              placeholder="—"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Final warning at (blank = off)
            </label>
            <input
              type="number" min={1} max={49}
              value={idleWarn2}
              onChange={(e) => setIdleWarn2(e.target.value)}
              placeholder="—"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
        </div>
        <button
          onClick={() => {
            const expire = Math.max(1, parseInt(idleExpire) || 1);
            const w1 = idleWarn1.trim() === "" ? null : parseInt(idleWarn1);
            const w2 = idleWarn2.trim() === "" ? null : parseInt(idleWarn2);
            // A warning at or past the freeze can never fire — drop it so we
            // never save a rung the client will ignore anyway.
            const clean = (w: number | null) => (w != null && w > 0 && w < expire ? w : null);
            saveKey("player_idle_policy", { expire, warn1: clean(w1), warn2: clean(w2) });
          }}
          disabled={saving === "player_idle_policy"}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          style={{ backgroundColor: "#f0b100" }}
        >
          {saving === "player_idle_policy" ? "Applying..." : "Apply"}
        </button>
      </div>

      {/* Chat minimum wager */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d08700" }}>
            Live chat minimum wager
          </h2>
          <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
            How much a player must have <strong>wagered</strong> (accepted +
            settled bets, lifetime) before they may send chat messages. Chat is
            the one place a visitor can address every seated player, so access is
            earned by playing — a funded balance that never bets does not count.
            A player under the bar gets a private system line telling them the
            amount; nobody else sees it. Set <strong>0</strong> to let everyone
            chat.
          </p>
        </div>
        <div className="max-w-xs">
          <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
            Minimum wagered (PHP)
          </label>
          <input
            type="number" min={0} step={50}
            value={chatMinWager}
            onChange={(e) => setChatMinWager(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={inputStyle}
          />
        </div>
        <button
          onClick={() => saveKey("chat_min_wager", Math.max(0, Number(chatMinWager) || 0))}
          disabled={saving === "chat_min_wager"}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          style={{ backgroundColor: "#f0b100" }}
        >
          {saving === "chat_min_wager" ? "Applying..." : "Apply"}
        </button>
      </div>

      {/* Minimum seat balance */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d08700" }}>
            Minimum seat balance
          </h2>
          <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
            Two wallet floors, in PHP, both enforced server-side.{" "}
            <strong>To start playing</strong> is the buy-in bar: a player with
            nothing on the table needs at least this much to bet at all.{" "}
            <strong>To keep a seat</strong> is the lower bar that applies once
            money IS on the table — it stops a player being ejected mid-hand by
            the stricter entry number, and is re-checked after each settlement.
            A player with a live bet is never cut mid-round. The overlay quotes
            whichever figure actually applies to that player. Warning is a soft
            nudge only. Applies platform-wide, from the next balance update.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Required to start playing
            </label>
            <input
              type="number" min={0} step={50}
              value={seatEnter}
              onChange={(e) => setSeatEnter(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Required to keep a seat (once betting)
            </label>
            <input
              type="number" min={0} step={50}
              value={seatBlock}
              onChange={(e) => setSeatBlock(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#99a1af" }}>
              Low-balance warning below
            </label>
            <input
              type="number" min={0} step={50}
              value={seatWarn}
              onChange={(e) => setSeatWarn(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={inputStyle}
            />
          </div>
        </div>
        <button
          onClick={() => {
            const num = (v: string) => Math.max(0, Number(v) || 0);
            const block = num(seatBlock);
            // Keep the ladder coherent before it ever reaches the server (which
            // clamps identically): entering below the keep-seat floor would admit
            // a player and gate them on the spot, and a warning under the floor
            // is a band that can never fire.
            const enter = Math.max(num(seatEnter), block);
            const warn = Math.max(num(seatWarn), block);
            saveKey("min_seat_balance", { enter, block, warn });
          }}
          disabled={saving === "min_seat_balance"}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          style={{ backgroundColor: "#f0b100" }}
        >
          {saving === "min_seat_balance" ? "Applying..." : "Apply"}
        </button>
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
