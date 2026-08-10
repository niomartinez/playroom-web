"use client";

import { useEffect, useState } from "react";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import { useAdminQuery } from "@/lib/admin-query";
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

const GOLD = "#f0b100";
const DIM = "#6a7282";
const MUTED = "#99a1af";
const CARD_BG = "#171717";
const CARD_BORDER = "1px solid rgba(208,135,0,0.2)";

const inputStyle = {
  backgroundColor: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(208,135,0,0.18)",
} as const;

/* Six rows on production, and each one is an editable object rather than a
   record to scan — so this is a card list, not a data table. A five-column grid
   at this row count is mostly empty space, and it squeezed the one control that
   matters (the name field) into a narrow cell.

   Editing changes what the money reports attribute to whom, so the page is
   ordered by that weight: naming is inline and saves on Enter, while merging
   and marking not-a-site sit behind a confirm that names the consequence. */
export default function SitesPage() {
  const { data, loading, refreshing, refetch } =
    useAdminQuery<SitesResponse>(ENDPOINT);
  const { toast } = useToast();
  const { canWrite } = useAdmin();
  const editable = canWrite("settings");

  const sites = data?.sites ?? [];
  const totalPlayers = sites.reduce((n, s) => n + s.registered_players, 0);
  const named = sites.filter((s) => s.label).length;

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<SiteRow | null>(null);
  const [confirmKind, setConfirmKind] = useState<"merge" | "hide" | "unhide">("hide");
  const [mergingCode, setMergingCode] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");

  /* Seed each input once, keyed by code, so a background revalidation can never
     overwrite something half-typed. */
  useEffect(() => {
    if (!data) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of data.sites ?? []) {
        if (!(s.code in next)) next[s.code] = s.label ?? "";
      }
      return next;
    });
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
        /* The chain and merge-xor-hide rules live in the database and its
           message names the offending code — surfacing it beats a generic
           failure the operator cannot act on. */
        toast({
          type: "error",
          message: json?.message || `Save failed (HTTP ${res.status})`,
        });
        return;
      }
      toast({ type: "success", message: `${row.code} saved` });
      /* refetch() ONLY — never invalidateAdminQuery() here. That helper just
         deletes the cache entry, which makes the hook read as never-fetched and
         blanks the whole list to a loading state that nothing refills. Refetching
         in place keeps the rows on screen and swaps the fresh data underneath. */
      refetch();
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(null);
    }
  }

  const mergeTargets = (code: string) =>
    sites.filter((s) => s.code !== code && s.is_site && !s.merge_into);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold text-white">Sites</h1>
          {!loading && sites.length > 0 && (
            <span className="text-sm" style={{ color: DIM }}>
              {named} of {sites.length} named
            </span>
          )}
        </div>
        <p className="text-sm max-w-3xl" style={{ color: MUTED }} title={SITE_HINT}>
          Derived from the first 3 characters of a player&rsquo;s username &mdash;
          the prefix OCMS&rsquo;s downstream sites use. OCMS sends us no site
          identifier, so this is the only signal we have. New codes appear here on
          their own as players register.
        </p>
      </header>

      <RefreshingHint show={refreshing && !loading} />

      {!editable && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(240,177,0,0.08)", color: GOLD }}
        >
          Read-only access to Settings &mdash; these controls are disabled.
        </div>
      )}

      {/* Skeleton rows rather than a centred "Loading…": the page keeps its
          shape, so nothing jumps when the data lands. */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl animate-pulse"
              style={{
                height: 76,
                backgroundColor: CARD_BG,
                border: CARD_BORDER,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      )}

      {!loading && sites.length === 0 && (
        <div
          className="rounded-xl px-6 py-12 text-center"
          style={{ backgroundColor: CARD_BG, border: CARD_BORDER, color: DIM }}
        >
          No sites yet. A code appears here as soon as a player registers with it.
        </div>
      )}

      <div className="space-y-3">
        {sites.map((s) => {
          const dirty = (drafts[s.code] ?? "") !== (s.label ?? "");
          const busy = saving === s.code;
          const share = totalPlayers
            ? (s.registered_players / totalPlayers) * 100
            : 0;
          const merging = mergingCode === s.code;

          return (
            <div
              key={s.code}
              className="rounded-xl px-4 py-4"
              style={{
                backgroundColor: CARD_BG,
                border: CARD_BORDER,
                opacity: s.is_site ? 1 : 0.72,
              }}
            >
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {/* Code — the identity of the row, so it reads first and big. */}
                <div
                  className="flex items-center justify-center rounded-lg font-mono font-bold shrink-0"
                  style={{
                    width: 64,
                    height: 44,
                    fontSize: 17,
                    letterSpacing: "0.05em",
                    backgroundColor: "rgba(208,135,0,0.12)",
                    border: "1px solid rgba(240,177,0,0.3)",
                    color: GOLD,
                  }}
                >
                  {s.code}
                </div>

                {/* Name — the control this page exists for, so it gets the room. */}
                <div className="flex items-center gap-2 flex-1 min-w-[15rem]">
                  <input
                    value={drafts[s.code] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [s.code]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && dirty && editable && !busy) {
                        save(s, { label: drafts[s.code] ?? "" });
                      }
                      if (e.key === "Escape") {
                        setDrafts((d) => ({ ...d, [s.code]: s.label ?? "" }));
                      }
                    }}
                    placeholder="Add a display name…"
                    disabled={!editable || busy}
                    maxLength={60}
                    aria-label={`Display name for ${s.code}`}
                    className="rounded-lg px-3 py-2 text-sm text-white outline-none w-full max-w-sm"
                    style={inputStyle}
                  />
                  {dirty && editable && (
                    <>
                      <button
                        onClick={() => save(s, { label: drafts[s.code] ?? "" })}
                        disabled={busy}
                        className="rounded-lg px-3 py-2 text-xs font-semibold shrink-0 disabled:opacity-60"
                        style={{ backgroundColor: GOLD, color: "#000" }}
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() =>
                          setDrafts((d) => ({ ...d, [s.code]: s.label ?? "" }))
                        }
                        disabled={busy}
                        className="rounded-lg px-2 py-2 text-xs shrink-0"
                        style={{ backgroundColor: "#262626", color: MUTED }}
                      >
                        Undo
                      </button>
                    </>
                  )}
                </div>

                {/* Players + share of the whole base — the context that tells you
                    whether a code is a real site or a stray prefix. */}
                <div className="w-32 shrink-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-sm text-white">
                      {s.registered_players.toLocaleString()}
                    </span>
                    <span className="text-xs" style={{ color: DIM }}>
                      {s.registered_players === 0
                        ? "—"
                        : share >= 0.1
                          ? `${share.toFixed(1)}%`
                          : "<0.1%"}
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.registered_players ? Math.max(share, 2) : 0}%`,
                        backgroundColor: GOLD,
                      }}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="w-36 shrink-0">
                  {!s.is_site ? (
                    <span
                      className="inline-block rounded px-2 py-1 text-[11px] font-semibold"
                      style={{
                        backgroundColor: "rgba(107,114,128,0.16)",
                        color: "#9ca3af",
                      }}
                      title="Its players show as Unassigned — still counted in every total"
                    >
                      NOT A SITE
                    </span>
                  ) : s.merge_into ? (
                    <span
                      className="inline-block rounded px-2 py-1 text-[11px] font-semibold font-mono"
                      style={{
                        backgroundColor: "rgba(0,188,125,0.12)",
                        color: "#00bc7d",
                      }}
                      title={`Reported under ${s.merge_into}`}
                    >
                      → {s.merge_into}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: DIM }}>
                      Reporting on its own
                    </span>
                  )}
                </div>

                {/* Actions */}
                {editable && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {s.merge_into ? (
                      <button
                        onClick={() => save(s, { merge_into: null })}
                        disabled={busy}
                        className="rounded-lg px-3 py-1.5 text-xs"
                        style={{ backgroundColor: "#262626", color: "#d1d5db" }}
                      >
                        Unmerge
                      </button>
                    ) : (
                      s.is_site &&
                      !merging && (
                        <button
                          onClick={() => {
                            setMergingCode(s.code);
                            setMergeTarget("");
                          }}
                          disabled={busy}
                          className="rounded-lg px-3 py-1.5 text-xs"
                          style={{ backgroundColor: "#262626", color: "#d1d5db" }}
                        >
                          Merge…
                        </button>
                      )
                    )}
                    <button
                      onClick={() => {
                        setConfirmKind(s.is_site ? "hide" : "unhide");
                        setConfirming(s);
                      }}
                      disabled={busy}
                      className="rounded-lg px-3 py-1.5 text-xs"
                      style={{ backgroundColor: "#262626", color: "#d1d5db" }}
                    >
                      {s.is_site ? "Not a site" : "Restore"}
                    </button>
                  </div>
                )}
              </div>

              {/* Merge picker — a select of real codes rather than a free-text
                  box, so a typo cannot create a merge into a code nobody uses
                  and silently empty this one. */}
              {merging && editable && (
                <div
                  className="mt-3 pt-3 flex flex-wrap items-center gap-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-xs" style={{ color: MUTED }}>
                    Report {s.code}&rsquo;s players under
                  </span>
                  <select
                    autoFocus
                    value={mergeTarget}
                    onChange={(e) => setMergeTarget(e.target.value)}
                    className="rounded-lg px-3 py-1.5 text-sm text-white outline-none font-mono"
                    style={inputStyle}
                  >
                    <option value="">Choose a site…</option>
                    {mergeTargets(s.code).map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.code}
                        {t.label ? ` — ${t.label}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (!mergeTarget) {
                        toast({
                          type: "error",
                          message: "Choose a site to merge into",
                        });
                        return;
                      }
                      setConfirmKind("merge");
                      setConfirming(s);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={{ backgroundColor: GOLD, color: "#000" }}
                  >
                    Merge
                  </button>
                  <button
                    onClick={() => {
                      setMergingCode(null);
                      setMergeTarget("");
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs"
                    style={{ backgroundColor: "#262626", color: MUTED }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && sites.length > 0 && (
        <p className="text-xs max-w-3xl" style={{ color: DIM }}>
          <strong style={{ color: MUTED }}>Merge</strong> reports one code&rsquo;s
          players under another &mdash; for a site that typo&rsquo;d its prefix.{" "}
          <strong style={{ color: MUTED }}>Not a site</strong> moves a code&rsquo;s
          players to <strong style={{ color: MUTED }}>Unassigned</strong>; they
          stay counted in every total, so no figure changes size. Both are
          recorded in the audit log.
        </p>
      )}

      {confirming && (
        <ConfirmDialog
          open
          danger={confirmKind !== "unhide"}
          title={
            confirmKind === "merge"
              ? `Merge ${confirming.code} into ${mergeTarget}`
              : confirmKind === "hide"
                ? `Mark ${confirming.code} as not a site`
                : `Restore ${confirming.code} as a site`
          }
          message={
            confirmKind === "merge"
              ? `${confirming.registered_players} player(s) under ${confirming.code} will be reported under ${mergeTarget} instead. This changes what the money reports attribute to each site.`
              : confirmKind === "hide"
                ? `${confirming.registered_players} player(s) under ${confirming.code} will move to Unassigned. They stay in every total — no figure changes size — but ${confirming.code} disappears from the site filters.`
                : `${confirming.code} will report as its own site again, and its players will leave Unassigned.`
          }
          confirmLabel={confirmKind === "merge" ? "Merge" : "Confirm"}
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            setConfirming(null);
            if (!row) return;
            if (confirmKind === "merge") {
              save(row, { merge_into: mergeTarget });
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
