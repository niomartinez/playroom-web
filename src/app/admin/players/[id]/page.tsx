"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import StatCard from "@/components/admin/ui/StatCard";

interface PlayerDetail {
  id: string;
  external_user_id: string;
  username: string;
  balance: number;
  currency_code: string;
  is_active: boolean;
  operator_id: string;
  operator_name: string;
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
  const id = params.id as string;

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const txPageSize = 15;

  const [showKick, setShowKick] = useState(false);
  const [kickResult, setKickResult] = useState<string | null>(null);

  const fetchPlayer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/players/${id}`);
      if (res.ok) {
        const json = await res.json();
        setPlayer(json.data ?? json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(txPage));
      params.set("page_size", String(txPageSize));

      const res = await fetch(
        `/api/admin/players/${id}/transactions?${params.toString()}`
      );
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setTransactions(data.transactions ?? []);
        setTxTotal(data.total ?? 0);
      }
    } catch {
      // silent
    } finally {
      setTxLoading(false);
    }
  }, [id, txPage]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  async function handleKick() {
    try {
      const res = await fetch(`/api/admin/players/${id}/kick`, {
        method: "POST",
      });
      if (res.ok) {
        setKickResult("Player kicked — all tokens revoked.");
        fetchPlayer();
      }
    } catch {
      // silent
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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/players")}
        className="flex items-center gap-1 text-sm hover:underline"
        style={{ color: "#99a1af" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Players
      </button>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{player.username}</h1>
        <StatusBadge status={player.is_active ? "active" : "inactive"} />
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
        className="rounded-xl p-6"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span style={{ color: "#6a7282" }}>External ID</span>
            <p className="text-white font-mono mt-0.5">
              {player.external_user_id}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Operator</span>
            <p className="text-white mt-0.5">{player.operator_name}</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          className="px-6 py-4"
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
          <div className="overflow-x-auto">
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
        )}

        {/* Transaction pagination */}
        {txTotalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 text-xs"
            style={{
              borderTop: "1px solid rgba(208,135,0,0.1)",
              color: "#6a7282",
            }}
          >
            <span>
              Page {txPage} of {txTotalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={txPage <= 1}
                onClick={() => setTxPage(txPage - 1)}
                className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5"
                style={{ color: "#99a1af" }}
              >
                Prev
              </button>
              <button
                disabled={txPage >= txTotalPages}
                onClick={() => setTxPage(txPage + 1)}
                className="rounded px-3 py-1 disabled:opacity-30 hover:bg-white/5"
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
        <button
          onClick={() => setShowKick(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
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
