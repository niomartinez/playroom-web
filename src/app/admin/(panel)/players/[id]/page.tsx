"use client";

import { useState } from "react";
import Link from "next/link";
import { SITE_HINT } from "@/components/admin/SiteFilter";
import RefreshingHint from "@/components/admin/ui/RefreshingHint";
import { useAdminQuery, invalidateAdminQuery } from "@/lib/admin-query";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import StatCard from "@/components/admin/ui/StatCard";
import MobileCardList, {
  type MobileCardItem,
} from "@/components/admin/ui/MobileCardList";
import { useToast } from "@/lib/toast-context";

interface PlayerDetail {
  id: string;
  external_user_id: string;
  username: string;
  display_name: string | null;
  display_name_set: boolean;
  balance: number;
  currency_code: string;
  is_active: boolean;
  is_test: boolean;
  operator_id: string;
  operator_name: string;
  /* Derived from the username prefix; null = prefix is not a known site. */
  site_code: string | null;
  site_label: string | null;
  operator_client_id: string;
  created_at: string;
  updated_at: string;
  stats: {
    total_bets: number;
    total_wagered: number;
    total_payout: number;
    net_result: number;
    settled_bets: number;
  };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  bet_id: string | null;
  created_at: string;
}

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const txPageSize = 15;
  const [txPage, setTxPage] = useState(1);

  const [showKick, setShowKick] = useState(false);
  const [kickResult, setKickResult] = useState<string | null>(null);

  /* Two cache keys: the player, and the page of transactions. Paging back and
     forth through history now re-renders from cache, and coming back to a
     player you were just looking at is instant. */
  const {
    data: playerData,
    loading,
    refreshing,
    refetch: fetchPlayer,
  } = useAdminQuery<PlayerDetail>(`/api/admin/players/${id}`);
  const player = playerData ?? null;

  const txQuery = new URLSearchParams({
    page: String(txPage),
    page_size: String(txPageSize),
  });
  const { data: txData, loading: txLoading } = useAdminQuery<{
    transactions: Transaction[];
    total: number;
  }>(`/api/admin/players/${id}/transactions?${txQuery.toString()}`);
  const transactions = txData?.transactions ?? [];
  const txTotal = txData?.total ?? 0;

  async function handleKick() {
    try {
      const res = await fetch(`/api/admin/players/${id}/kick`, {
        method: "POST",
      });
      if (res.ok) {
        setKickResult("Player kicked — all tokens revoked.");
        // A kick changes this player's row on the LIST too (tokens revoked,
        // possibly inactive), so drop the whole prefix rather than just
        // refetching the detail we happen to be looking at.
        invalidateAdminQuery("/api/admin/players");
        fetchPlayer();
        toast({ type: "success", message: "Player kicked" });
      } else {
        toast({ type: "error", message: "Failed to kick player" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>Loading player...</span>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>Player not found</span>
      </div>
    );
  }

  const stats = player.stats ?? {
    total_bets: 0, total_wagered: 0, total_payout: 0,
    net_result: 0, settled_bets: 0,
  };
  const txTotalPages = Math.max(1, Math.ceil(txTotal / txPageSize));

  function txTypeColor(type: string): string {
    if (type === "credit") return "#00bc7d";
    if (type === "debit") return "#fb2c36";
    if (type === "void_refund") return "#f0b100";
    return "#99a1af";
  }

  const money = (v: number) =>
    Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 });

  /* Below md a six-column ledger either side-scrolls or squashes, so each
     transaction becomes a card instead: the type heads it, the rest of the
     columns drop underneath as label/value pairs. */
  const txCards: MobileCardItem[] = transactions.map((tx) => ({
    id: tx.id,
    title: (
      <span
        className="text-xs font-semibold uppercase"
        style={{ color: txTypeColor(tx.type) }}
      >
        {tx.type.replace(/_/g, " ")}
      </span>
    ),
    rows: [
      {
        label: "Amount",
        value: (
          <span className="font-mono" style={{ color: txTypeColor(tx.type) }}>
            {tx.type === "credit" || tx.type === "void_refund" ? "+" : "-"}
            {money(Math.abs(Number(tx.amount)))}
          </span>
        ),
      },
      {
        label: "Before",
        value: (
          <span className="font-mono" style={{ color: "#99a1af" }}>
            {money(tx.balance_before)}
          </span>
        ),
      },
      {
        label: "After",
        value: <span className="font-mono">{money(tx.balance_after)}</span>,
      },
      { label: "Description", value: tx.description || "\u2014" },
      { label: "Date", value: new Date(tx.created_at).toLocaleString() },
    ],
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/players")}
        className="flex items-center gap-1 text-sm hover:underline max-md:min-h-[44px]"
        style={{ color: "#99a1af" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Players
      </button>

      <div className="flex flex-wrap items-center gap-3">
        {/* Lead with the screen name — it is what the player is called
            everywhere they are visible. The operator's username stays right
            beside it, since that is the id the partner will quote back. */}
        <h1 className="text-2xl font-bold text-white">
          {player.display_name_set && player.display_name
            ? player.display_name
            : player.username}
        </h1>
        {player.display_name_set && player.display_name && (
          <span className="font-mono text-sm" style={{ color: "#6a7282" }}>
            {player.username}
          </span>
        )}
        <RefreshingHint show={refreshing && !loading} />
        <StatusBadge status={player.is_active ? "active" : "inactive"} />
        {/* Reachable by direct link even while the list hides testers, and the
            stats below are then play money on a real table — say so. */}
        {player.is_test && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
            style={{
              backgroundColor: "rgba(208,135,0,0.15)",
              color: "#f0b100",
              border: "1px solid rgba(240,177,0,0.35)",
            }}
          >
            TEST ACCOUNT
          </span>
        )}
      </div>

      {/* Kick result */}
      {kickResult && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "rgba(240,177,0,0.08)",
            border: "1px solid rgba(240,177,0,0.3)",
          }}
        >
          <p className="text-sm" style={{ color: "#f0b100" }}>
            {kickResult}
          </p>
        </div>
      )}

      {/* Info card */}
      <div
        className="rounded-xl p-6 max-md:p-4"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        {/* Single column on a phone: half of 390px cannot hold a timestamp. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span style={{ color: "#6a7282" }}>External ID</span>
            <p className="text-white font-mono mt-0.5">
              {player.external_user_id}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>System Provider</span>
            <p className="text-white mt-0.5">{player.operator_name}</p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }} title={SITE_HINT}>
              Site
            </span>
            <p className="mt-0.5">
              {player.site_code ? (
                <Link
                  href={`/admin/players?site=${encodeURIComponent(player.site_code)}`}
                  className="font-mono font-semibold"
                  style={{ color: "#f0b100" }}
                >
                  {player.site_label || player.site_code}
                </Link>
              ) : (
                <span style={{ color: "#6a7282" }}>Unassigned</span>
              )}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Balance</span>
            <p className="text-white font-mono mt-0.5">
              {Number(player.balance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              {player.currency_code}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Currency</span>
            <p className="text-white mt-0.5">{player.currency_code}</p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Joined</span>
            <p className="text-white mt-0.5">
              {new Date(player.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Last Updated</span>
            <p className="text-white mt-0.5">
              {new Date(player.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Bet statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Bets"
          value={stats.total_bets.toLocaleString()}
        />
        <StatCard
          label="Total Wagered"
          value={stats.total_wagered.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        />
        <StatCard
          label="Total Payout"
          value={stats.total_payout.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        />
        <StatCard
          label="Net Result"
          value={stats.net_result.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
          color={stats.net_result >= 0 ? "#00bc7d" : "#fb2c36"}
        />
      </div>

      {/* Transaction history */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div
          className="px-6 py-4 max-md:px-4"
          style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}
        >
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "#d08700" }}
          >
            Transactions ({txTotal})
          </h2>
        </div>

        {txLoading ? (
          <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>
            Loading...
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>
            No transactions found
          </div>
        ) : (
          <>
          {/* Cards below md, the table above it. */}
          <div className="md:hidden px-4 py-4">
            <MobileCardList items={txCards} />
          </div>
          <div className="overflow-x-auto max-md:hidden">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(208,135,0,0.15)",
                  }}
                >
                  {["Type", "Amount", "Before", "After", "Description", "Date"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                        style={{ color: "#d08700" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold uppercase"
                        style={{ color: txTypeColor(tx.type) }}
                      >
                        {tx.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 font-mono"
                      style={{ color: txTypeColor(tx.type) }}
                    >
                      {tx.type === "credit" || tx.type === "void_refund"
                        ? "+"
                        : "-"}
                      {Math.abs(Number(tx.amount)).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className="px-4 py-3 font-mono"
                      style={{ color: "#99a1af" }}
                    >
                      {Number(tx.balance_before).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-white">
                      {Number(tx.balance_after).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className="px-4 py-3 text-xs max-w-[200px] truncate"
                      style={{ color: "#6a7282" }}
                    >
                      {tx.description || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#99a1af" }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Transaction pagination */}
        {txTotalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 text-xs max-md:flex-col max-md:items-stretch max-md:gap-3"
            style={{
              borderTop: "1px solid rgba(208,135,0,0.1)",
              color: "#6a7282",
            }}
          >
            <span className="max-md:text-center">
              Page {txPage} of {txTotalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={txPage <= 1}
                onClick={() => setTxPage(txPage - 1)}
                className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5 max-md:flex-1 max-md:min-h-[44px]"
                style={{ color: "#99a1af" }}
              >
                Prev
              </button>
              <button
                disabled={txPage >= txTotalPages}
                onClick={() => setTxPage(txPage + 1)}
                className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5 max-md:flex-1 max-md:min-h-[44px]"
                style={{ color: "#99a1af" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Kick action */}
      <div
        className="rounded-xl p-6 space-y-4 max-md:p-4"
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
        <button
          onClick={() => setShowKick(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors max-md:w-full max-md:min-h-[44px]"
          style={{
            backgroundColor: "rgba(251,44,54,0.1)",
            color: "#fb2c36",
            border: "1px solid rgba(251,44,54,0.3)",
          }}
        >
          Kick Player
        </button>
      </div>

      <ConfirmDialog
        open={showKick}
        onClose={() => setShowKick(false)}
        onConfirm={handleKick}
        title="Kick Player"
        message={`This will revoke all active tokens for "${player.username}" and disconnect them from all active sessions. They will need to re-authenticate.`}
        confirmLabel="Kick"
        danger
      />
    </div>
  );
}
