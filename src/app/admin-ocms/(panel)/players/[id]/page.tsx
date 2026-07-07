import Link from "next/link";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import StatCard from "@/components/admin/ui/StatCard";
import LinkSpinner from "@/components/admin/ui/LinkSpinner";
import { getPlayerDetail, getPlayerTransactions } from "@/lib/ocms-server";

const TX_PAGE_SIZE = 15;

function txTypeColor(type: string): string {
  if (type === "credit") return "#00bc7d";
  if (type === "debit") return "#fb2c36";
  if (type === "void_refund") return "#f0b100";
  return "#99a1af";
}

export default async function OcmsPlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ txPage?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const txPage = Math.max(1, Number(sp.txPage) || 1);

  const [player, txData] = await Promise.all([
    getPlayerDetail(id),
    getPlayerTransactions(id, txPage, TX_PAGE_SIZE),
  ]);

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <span style={{ color: "#6a7282" }}>Player not found</span>
        <Link
          href="/admin-ocms/players"
          className="text-sm hover:underline"
          style={{ color: "#99a1af" }}
        >
          Back to Players
        </Link>
      </div>
    );
  }

  const stats = player.stats ?? {
    total_bets: 0,
    total_wagered: 0,
    total_payout: 0,
    net_result: 0,
    settled_bets: 0,
  };
  const transactions = txData.transactions;
  const txTotal = txData.total;
  const txTotalPages = Math.max(1, Math.ceil(txTotal / TX_PAGE_SIZE));

  function txPageHref(p: number): string {
    return p > 1
      ? `/admin-ocms/players/${id}?txPage=${p}`
      : `/admin-ocms/players/${id}`;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        href="/admin-ocms/players"
        className="flex items-center gap-1 text-sm hover:underline"
        style={{ color: "#99a1af" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Players
        <LinkSpinner />
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{player.username}</h1>
        <StatusBadge status={player.is_active ? "active" : "inactive"} />
      </div>

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
              {player.created_at
                ? new Date(player.created_at).toLocaleString()
                : "—"}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Last Updated</span>
            <p className="text-white mt-0.5">
              {player.updated_at
                ? new Date(player.updated_at).toLocaleString()
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Bet statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Bets" value={stats.total_bets.toLocaleString()} />
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

        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>
            No transactions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}>
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
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
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
                    <td className="px-4 py-3 font-mono" style={{ color: "#99a1af" }}>
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
                      {tx.description || "—"}
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
              {txPage > 1 ? (
                <Link
                  href={txPageHref(txPage - 1)}
                  scroll={false}
                  className="flex items-center gap-1.5 rounded px-3 py-1 hover:bg-white/5"
                  style={{ color: "#99a1af" }}
                >
                  <LinkSpinner /> Prev
                </Link>
              ) : (
                <span className="rounded px-3 py-1 opacity-30" style={{ color: "#99a1af" }}>
                  Prev
                </span>
              )}
              {txPage < txTotalPages ? (
                <Link
                  href={txPageHref(txPage + 1)}
                  scroll={false}
                  className="flex items-center gap-1.5 rounded px-3 py-1 hover:bg-white/5"
                  style={{ color: "#99a1af" }}
                >
                  Next <LinkSpinner />
                </Link>
              ) : (
                <span className="rounded px-3 py-1 opacity-30" style={{ color: "#99a1af" }}>
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
