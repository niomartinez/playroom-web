"use client";

/**
 * Mock-data controls — the hidden settings for the HWN / HappyWin88 QA site.
 *
 * Renders NOTHING unless the caller is a manager (Nio / Heins). A non-manager —
 * every other admin, Wayne included — gets `can_manage: false` from the backend
 * and this component returns null, so there is no dimmed switch, no greyed
 * label, nothing to notice: the feature does not exist for them.
 *
 * Managers get two switches for their own view (show/hide, label/unlabel) and
 * the same two for Wayne. None of it is audited — the PATCH endpoints behind
 * these switches write no audit_log row, by design.
 */

import { useState } from "react";
import { useAdminQuery, invalidateAdminQuery } from "@/lib/admin-query";
import { useToast } from "@/lib/toast-context";

interface WayneState {
  exists: boolean;
  can_view?: boolean;
  visible?: boolean;
  labeled?: boolean;
}
interface ViewState {
  can_view: boolean;
  can_manage: boolean;
  visible: boolean;
  labeled: boolean;
  mock_site_codes: string[];
  wayne?: WayneState;
}

const VIEW_STATE_URL = "/api/admin/mock/view-state";

function Toggle({
  on,
  onToggle,
  label,
  hint,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <div>
        <label className="text-xs font-medium" style={{ color: "#99a1af" }}>
          {label}
        </label>
        {hint && (
          <p className="text-xs mt-0.5" style={{ color: "#6a7282" }}>
            {hint}
          </p>
        )}
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        aria-label={label}
        className="relative shrink-0 rounded-full transition-colors"
        style={{
          width: 44,
          height: 24,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: on ? "rgba(208,135,0,0.6)" : "rgba(255,255,255,0.1)",
        }}
      >
        <span
          className="absolute top-0.5 rounded-full transition-transform bg-white"
          style={{ width: 20, height: 20, left: on ? 22 : 2 }}
        />
      </button>
    </div>
  );
}

export default function MockDataSettings() {
  const { toast } = useToast();
  // useAdminQuery already unwraps BaseResponse.data, so this is the ViewState.
  const { data: view } = useAdminQuery<ViewState>(VIEW_STATE_URL);
  const [busy, setBusy] = useState(false);

  // Hidden for everyone who is not a manager. This is the whole privacy model:
  // the control simply is not in the DOM.
  if (!view || !view.can_manage) return null;

  async function patch(url: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      invalidateAdminQuery(VIEW_STATE_URL);
      // Reports/players/sites all change shape when mock toggles; drop their
      // caches so the panel reflects it without a manual refresh.
      invalidateAdminQuery("/api/admin/reports");
      invalidateAdminQuery("/api/admin/players");
      invalidateAdminQuery("/api/admin/sites");
      toast({ type: "success", message: "Updated" });
    } catch {
      toast({ type: "error", message: "Could not update mock settings" });
    } finally {
      setBusy(false);
    }
  }

  const wayne = view.wayne;

  return (
    <div
      className="rounded-xl p-6 space-y-2 max-md:p-4"
      style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
    >
      <div>
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "#d08700" }}
        >
          Mock data
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#6a7282" }}>
          QA site {view.mock_site_codes.join(", ") || "HWN"}. Internal only — never
          sent to any operator. Changes here are not audited.
        </p>
      </div>

      <Toggle
        on={view.visible}
        disabled={busy}
        onToggle={() => patch("/api/admin/mock/prefs", { visible: !view.visible })}
        label="Show mock data"
        hint="Off = your reports read real-only, as if the mock site did not exist."
      />
      <Toggle
        on={view.labeled}
        disabled={busy || !view.visible}
        onToggle={() => patch("/api/admin/mock/prefs", { labeled: !view.labeled })}
        label="Label as mock"
        hint="Off = the mock site reads as an ordinary site, unlabelled."
      />

      {/* Wayne — managed by Nio/Heins only; he can never change these himself. */}
      <div className="pt-3 mt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs font-semibold" style={{ color: "#99a1af" }}>
          Wayne
        </p>
        {wayne?.exists === false ? (
          <p className="text-xs mt-1" style={{ color: "#6a7282" }}>
            Wayne account not found on this environment.
          </p>
        ) : (
          <>
            {/* One switch, not two: "may see" and "show" were the same decision
                from a manager's side. On = Wayne is in and sees mock; off = he
                doesn't. */}
            <Toggle
              on={!!wayne?.visible}
              disabled={busy}
              onToggle={() => {
                const next = !wayne?.visible;
                patch("/api/admin/mock/wayne", { can_view: next, visible: next });
              }}
              label="Show mock data to Wayne"
              hint="Off = Wayne's reports read real-only."
            />
            <Toggle
              on={!!wayne?.labeled}
              disabled={busy || !wayne?.visible}
              onToggle={() =>
                patch("/api/admin/mock/wayne", { labeled: !wayne?.labeled })
              }
              label="Label as mock for Wayne"
            />
          </>
        )}
      </div>
    </div>
  );
}
