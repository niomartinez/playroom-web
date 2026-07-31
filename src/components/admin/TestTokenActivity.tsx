"use client";

import { useEffect } from "react";
import { useAdminQuery } from "@/lib/admin-query";

/**
 * One test token's whole story, in a slide-over.
 *
 * The list page answers "what tokens exist". This answers "what happened to
 * THIS one" — who made it, who topped it up, who killed it, where it was last
 * used from, whether the stream got cut on it, and what it actually played.
 * Before this, the only trace of an expire or a top-up was a line in a global
 * audit list that rendered every row as if it were a generate.
 */

interface AuditRow {
  created_at: string;
  action: string;
  entity_id: string;
  new_value: {
    count?: number;
    balance?: string;
    by?: string;
    amount?: string;
    new_balance?: string;
    external_user_id?: string;
    testers?: string[];
  };
  admin_users?: { email?: string; display_name?: string };
}

interface TokenRow {
  id: string;
  created_at: string;
  expires_at: string | null;
  status: "active" | "expired" | "revoked";
  table: string | null;
  token_preview: string | null;
  last_seen_ip: string | null;
  last_seen_ip_label: string | null;
  created_ip: string | null;
  created_ip_label: string | null;
  stream_revoked: boolean | null;
  idle_rounds: number | null;
  last_seen_at: string | null;
}

interface BetRow {
  id: string;
  bet_amount: string | number;
  team: string | null;
  payoff: string | number | null;
  status: string;
  created_at: string;
  round?: { external_fight_id?: string; status?: string; result?: string } | null;
}

interface ActivityData {
  player: {
    id: string;
    display_name: string;
    external_user_id: string;
    balance: string;
    created_at: string;
  };
  tokens: TokenRow[];
  audit: AuditRow[];
  bets: BetRow[];
  bet_total: number;
  totals: { wagered: number; returned: number; net: number };
}

const STATUS_COLOR: Record<string, string> = {
  active: "#6ee7b7",
  expired: "#9ca3af",
  revoked: "#f87171",
};

function fmt(ts: string | null | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function peso(v: string | number | null | undefined): string {
  return `₱${Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** An address, named if the allowlist knows it. */
function Ip({ ip, label }: { ip: string | null; label: string | null }) {
  if (!ip) return <span style={{ color: "#4b5563" }}>—</span>;
  return (
    <span title={ip}>
      {label ? (
        <>
          <span style={{ color: "#e5e7eb" }}>{label}</span>
          <span className="font-mono ml-1" style={{ color: "#6b7280" }}>
            {ip}
          </span>
        </>
      ) : (
        <span className="font-mono" style={{ color: "#9ca3af" }}>
          {ip}
        </span>
      )}
    </span>
  );
}

function sentence(a: AuditRow): string {
  const v = a.new_value || {};
  const who = v.external_user_id || a.entity_id;
  switch (a.action) {
    case "test_token.add_funds":
      return `added ${peso(v.amount)}${
        v.new_balance ? ` · new balance ${peso(v.new_balance)}` : ""
      }`;
    case "test_token.expire":
      return "expired this token";
    case "test_token.generate":
      return `generated ${v.count ?? "?"} token(s) on ${a.entity_id}${
        v.balance ? ` · ${peso(v.balance)} each` : ""
      }`;
    default:
      return `${a.action} on ${who}`;
  }
}

export default function TestTokenActivity({
  playerId,
  title,
  onClose,
}: {
  playerId: string;
  title: string;
  onClose: () => void;
}) {
  const { data, loading, error } = useAdminQuery<ActivityData>(
    `/api/admin/test-token/${playerId}/activity`
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const section = "text-xs font-semibold uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label={`Activity for ${title}`}
        className="relative h-full w-full max-w-2xl overflow-y-auto p-6 max-md:p-4 space-y-5"
        style={{ backgroundColor: "#0a0a0a", borderLeft: "1px solid #1f2937" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white font-mono break-all">{title}</h2>
            {data?.player && (
              <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
                {data.player.external_user_id} · created {fmt(data.player.created_at)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded px-3 py-1 text-sm max-md:min-h-[44px]"
            style={{ backgroundColor: "#1f2937", color: "#e5e7eb" }}
          >
            Close
          </button>
        </div>

        {loading && <p style={{ color: "#6b7280" }}>Loading activity…</p>}
        {error && <p style={{ color: "#f87171" }}>{error}</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Balance", peso(data.player.balance)],
                ["Wagered", peso(data.totals.wagered)],
                ["Returned", peso(data.totals.returned)],
                ["Net", peso(data.totals.net)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: "#111827", border: "1px solid #1f2937" }}
                >
                  <p className="text-[11px]" style={{ color: "#6b7280" }}>
                    {label}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "#e5e7eb" }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className={section} style={{ color: "#d08700" }}>
                Tokens &amp; where they were used
              </h3>
              {data.tokens.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg p-3 text-xs space-y-1"
                  style={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a" }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono" style={{ color: "#9ca3af" }}>
                      {t.token_preview}
                    </span>
                    <span style={{ color: STATUS_COLOR[t.status] }}>{t.status}</span>
                    {t.table && <span style={{ color: "#6b7280" }}>on {t.table}</span>}
                    {t.stream_revoked && (
                      <span style={{ color: "#f87171" }}>
                        stream cut{t.idle_rounds ? ` · idle ${t.idle_rounds}` : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#6b7280" }}>
                    Last used {fmt(t.last_seen_at)} from{" "}
                    <Ip ip={t.last_seen_ip} label={t.last_seen_ip_label} />
                  </div>
                  <div style={{ color: "#6b7280" }}>
                    Created {fmt(t.created_at)} from{" "}
                    <Ip ip={t.created_ip} label={t.created_ip_label} /> · expires{" "}
                    {fmt(t.expires_at)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className={section} style={{ color: "#d08700" }}>
                Admin actions
              </h3>
              {data.audit.length === 0 && (
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  Nothing recorded for this token.
                </p>
              )}
              {data.audit.map((a, i) => (
                <div
                  key={i}
                  className="text-xs px-3 py-2 rounded"
                  style={{ backgroundColor: "#0d0d0d", border: "1px solid #1a1a1a", color: "#9ca3af" }}
                >
                  <span style={{ color: "#d1d5db" }}>{fmt(a.created_at)}</span>
                  {" — "}
                  <span style={{ color: "#93c5fd" }}>
                    {a.new_value?.by || a.admin_users?.email || "admin"}
                  </span>{" "}
                  {sentence(a)}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className={section} style={{ color: "#d08700" }}>
                Bets ({data.bet_total})
              </h3>
              {data.bets.length === 0 && (
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  This token never placed a bet.
                </p>
              )}
              {data.bets.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead style={{ color: "#6b7280" }}>
                      <tr className="text-left">
                        <th className="px-2 py-1 font-medium whitespace-nowrap">When</th>
                        <th className="px-2 py-1 font-medium whitespace-nowrap">Round</th>
                        <th className="px-2 py-1 font-medium whitespace-nowrap">Bet</th>
                        <th className="px-2 py-1 font-medium whitespace-nowrap">Stake</th>
                        <th className="px-2 py-1 font-medium whitespace-nowrap">Payout</th>
                        <th className="px-2 py-1 font-medium whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bets.map((b) => (
                        <tr key={b.id} style={{ borderTop: "1px solid #1a1a1a", color: "#d1d5db" }}>
                          <td className="px-2 py-1 whitespace-nowrap">{fmt(b.created_at)}</td>
                          <td className="px-2 py-1 whitespace-nowrap font-mono" style={{ color: "#9ca3af" }}>
                            {b.round?.external_fight_id || "—"}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap">{b.team || "—"}</td>
                          <td className="px-2 py-1 whitespace-nowrap">{peso(b.bet_amount)}</td>
                          <td className="px-2 py-1 whitespace-nowrap">{peso(b.payoff)}</td>
                          <td className="px-2 py-1 whitespace-nowrap">{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
