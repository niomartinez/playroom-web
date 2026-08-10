"use client";

import { useEffect, useState } from "react";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminQuery, invalidateAdminQuery } from "@/lib/admin-query";
import { useToast } from "@/lib/toast-context";
import { useAdmin } from "@/lib/admin-context";
import { SITE_HINT } from "@/components/admin/SiteFilter";

interface SiteRow {
  code: string;
  label: string | null;
  merge_into: string | null;
  is_site: boolean;
  note: string | null;
  registered_players: number;
  last_player_at: string | null;
  has_override: boolean;
}

interface SitesResponse {
  sites?: SiteRow[];
  total?: number;
}

const ENDPOINT = "/api/admin/site-overrides";

/* Editing this table changes what the money reports attribute to whom, so the
   two destructive controls (merge, not-a-site) confirm and the naming control
   does not. Renaming GSP to "GameSpot" moves no money; merging JLA into JL5
   moves an entire site's GGR into another row. */
export default function SitesPage() {
  const { data, loading, refreshing } = useAdminQuery<SitesResponse>(ENDPOINT);
  const { toast } = useToast();
  const { canWrite } = useAdmin();
  const editable = canWrite("settings");

  const sites = data?.sites ?? [];
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<SiteRow | null>(null);
  const [confirmKind, setConfirmKind] = useState<"merge" | "hide" | "unhide">("hide");
  /* Which row has its merge input open, and what has been typed into it. The
     target is entered inline rather than in the dialog so the confirmation can
     name it — "merge JLA into JL5" is a decision, "merge JLA into…" is not. */
  const [mergingCode, setMergingCode] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");

  /* Seed the label inputs once the rows arrive. Keyed by code so a background
     revalidation cannot wipe something half-typed. */
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of sites) {
        if (!(s.code in next)) next[s.code] = s.label ?? "";
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function save(row: SiteRow, patch: Partial<SiteRow>) {
    setSaving(row.code);
    try {
      const body = {
        code: row.code,
        label: patch.label !== undefined ? patch.label : (drafts[row.code] ?? ""),
        merge_into: patch.merge_into !== undefined ? patch.merge_into : row.merge_into,
        is_site: patch.is_site !== undefined ? patch.is_site : row.is_site,
        note: row.note,
      };
      const res = await fetch(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || (json?.error_code && json.error_code !== "0")) {
        /* The single-hop and merge-xor-hide rules live in the database, and its
           message names the offending code. Surfacing it beats a generic
           failure the operator cannot act on. */
        toast({ type: "error", message: json?.message || `Save failed (HTTP ${res.status})` });
        return;
      }
      toast({ type: "success", message: `${row.code} saved` });
      invalidateAdminQuery(ENDPOINT);
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(null);
    }
  }

  const th =
    "text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider";
  const inputStyle = {
    backgroundColor: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(208,135,0,0.15)",
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sites</h1>
        <p className="text-sm mt-1" style={{ color: "#99a1af" }} title={SITE_HINT}>
          Sites are derived from the first 3 characters of a player&rsquo;s
          username &mdash; the prefix OCMS&rsquo;s downstream sites use. OCMS
          sends us no site identifier, so this is the only signal we have.
          New codes appear here automatically as players register.
        </p>
      </div>

      <RefreshingHint show={refreshing && !loading} />

      {!editable && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(240,177,0,0.08)", color: "#f0b100" }}
        >
          You have read-only access to Settings, so these controls are disabled.
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#171717", border: "1px solid rgba(208,135,0,0.2)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}>
                <th className={th} style={{ color: "#d08700" }}>Code</th>
                <th className={th} style={{ color: "#d08700" }}>Display name</th>
                <th className={th} style={{ color: "#d08700" }}>Players</th>
                <th className={th} style={{ color: "#d08700" }}>Status</th>
                <th className={th} style={{ color: "#d08700" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "#6a7282" }}>
                    Loading&hellip;
                  </td>
                </tr>
              )}
              {!loading && sites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "#6a7282" }}>
                    No sites yet
                  </td>
                </tr>
              )}
              {sites.map((s) => {
                const dirty = (drafts[s.code] ?? "") !== (s.label ?? "");
                return (
                  <tr key={s.code} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold" style={{ color: "#f0b100" }}>
                        {s.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          value={drafts[s.code] ?? ""}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [s.code]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && dirty && editable) {
                              save(s, { label: drafts[s.code] ?? "" });
                            }
                          }}
                          placeholder={`${s.code} (unnamed)`}
                          disabled={!editable}
                          maxLength={60}
                          className="rounded-lg px-3 py-1.5 text-sm text-white outline-none w-52"
                          style={inputStyle}
                        />
                        {dirty && editable && (
                          <button
                            onClick={() => save(s, { label: drafts[s.code] ?? "" })}
                            disabled={saving === s.code}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                            style={{ backgroundColor: "#f0b100", color: "#000" }}
                          >
                            {saving === s.code ? "Saving…" : "Save"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "#99a1af" }}>
                      {s.registered_players.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {!s.is_site ? (
                        <span
                          className="rounded px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            backgroundColor: "rgba(107,114,128,0.15)",
                            color: "#9ca3af",
                          }}
                          title="Players with this prefix show as Unassigned — still counted in every total"
                        >
                          NOT A SITE
                        </span>
                      ) : s.merge_into ? (
                        <span
                          className="rounded px-2 py-0.5 text-[11px] font-semibold font-mono"
                          style={{
                            backgroundColor: "rgba(0,188,125,0.12)",
                            color: "#00bc7d",
                          }}
                          title={`Reported as ${s.merge_into}`}
                        >
                          → {s.merge_into}
                        </span>
                      ) : (
                        <span style={{ color: "#6a7282" }}>Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editable && (
                        <div className="flex flex-wrap gap-2">
                          {s.merge_into ? (
                            <button
                              onClick={() => save(s, { merge_into: null })}
                              className="rounded-lg px-2.5 py-1 text-xs"
                              style={{ backgroundColor: "#262626", color: "#d1d5db" }}
                            >
                              Unmerge
                            </button>
                          ) : (
                            s.is_site &&
                            (mergingCode === s.code ? (
                              <span className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  value={mergeTarget}
                                  onChange={(e) =>
                                    setMergeTarget(e.target.value.toUpperCase())
                                  }
                                  placeholder="e.g. JL5"
                                  maxLength={3}
                                  className="rounded-lg px-2 py-1 text-xs text-white outline-none font-mono w-24"
                                  style={inputStyle}
                                />
                                <button
                                  onClick={() => {
                                    if (!mergeTarget.trim()) {
                                      toast({ type: "error", message: "Enter the code to merge into" });
                                      return;
                                    }
                                    setConfirmKind("merge");
                                    setConfirming(s);
                                  }}
                                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                                  style={{ backgroundColor: "#f0b100", color: "#000" }}
                                >
                                  Merge
                                </button>
                                <button
                                  onClick={() => {
                                    setMergingCode(null);
                                    setMergeTarget("");
                                  }}
                                  className="rounded-lg px-2 py-1 text-xs"
                                  style={{ backgroundColor: "#262626", color: "#9ca3af" }}
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setMergingCode(s.code);
                                  setMergeTarget("");
                                }}
                                className="rounded-lg px-2.5 py-1 text-xs"
                                style={{ backgroundColor: "#262626", color: "#d1d5db" }}
                              >
                                Merge into…
                              </button>
                            ))
                          )}
                          <button
                            onClick={() => {
                              setConfirmKind(s.is_site ? "hide" : "unhide");
                              setConfirming(s);
                            }}
                            className="rounded-lg px-2.5 py-1 text-xs"
                            style={{ backgroundColor: "#262626", color: "#d1d5db" }}
                          >
                            {s.is_site ? "Mark not a site" : "Mark as a site"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs" style={{ color: "#6a7282" }}>
        Merging reports one code&rsquo;s players under another &mdash; used when
        a site typo&rsquo;d its prefix. Marking a code &ldquo;not a site&rdquo;
        moves its players to <strong>Unassigned</strong>; they are still counted
        in every total, so no figure changes size. Both are recorded in the
        audit log.
      </p>

      {confirming && (
        <ConfirmDialog
          open
          title={
            confirmKind === "merge"
              ? `Merge ${confirming.code} into ${mergeTarget.trim().toUpperCase()}`
              : confirmKind === "hide"
                ? `Mark ${confirming.code} as not a site`
                : `Mark ${confirming.code} as a real site`
          }
          message={
            confirmKind === "merge"
              ? `${confirming.registered_players} player(s) under ${confirming.code} will be reported under ${mergeTarget.trim().toUpperCase()} instead. This changes what the money reports attribute to each site.`
              : confirmKind === "hide"
                ? `${confirming.registered_players} player(s) under ${confirming.code} will move to Unassigned. They stay in every total — no figure changes size — but ${confirming.code} disappears from the site filters.`
                : `${confirming.code} will appear as its own site again, and its players will leave Unassigned.`
          }
          confirmLabel={confirmKind === "merge" ? "Merge" : "Confirm"}
          danger={confirmKind !== "unhide"}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            setConfirming(null);
            if (!row) return;
            if (confirmKind === "merge") {
              save(row, { merge_into: mergeTarget.trim().toUpperCase() });
              setMergingCode(null);
              setMergeTarget("");
            } else {
              save(row, { is_site: confirmKind === "unhide" });
            }
          }}
        />
      )}
    </div>
  );
}
