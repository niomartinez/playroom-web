"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import ConfirmDialog from "@/components/admin/ui/ConfirmDialog";
import {
  RoundCards,
  resultColor,
  statusToBadge,
  betStatusBadge,
} from "@/components/round/round-display";
import { useToast } from "@/lib/toast-context";

interface Bet {
  id: string;
  external_bet_id: string;
  player_id: string;
  player_username: string;
  player_external_id: string;
  bet_amount: number;
  team: string;
  odds: number | null;
  payoff: number | null;
  status: string;
  settled_at: string | null;
  voided_at: string | null;
  created_at: string;
}

interface RoundDetail {
  id: string;
  external_fight_id: string;
  game_id: string;
  game_name: string;
  external_game_id: string;
  status: string;
  result: string | null;
  banker_cards: string[] | null;
  player_cards: string[] | null;
  banker_score: number | null;
  player_score: number | null;
  round_details: Record<string, unknown> | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  bets: Bet[];
  bet_count: number;
  total_wagered: number;
}

export default function RoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [round, setRound] = useState<RoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVoid, setShowVoid] = useState(false);
  const [voidResult, setVoidResult] = useState<string | null>(null);

  const fetchRound = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rounds/${id}`);
      if (res.ok) {
        const json = await res.json();
        setRound(json.data ?? json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  async function handleVoid() {
    try {
      const res = await fetch(`/api/admin/rounds/${id}/void`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        const msg = `Round voided. ${data.voided_bets ?? 0} bet(s) voided.`;
        setVoidResult(msg);
        fetchRound();
        toast({ type: "success", message: msg });
      } else {
        const json = await res.json().catch(() => ({}));
        toast({ type: "error", message: json.message || "Failed to void round" });
      }
    } catch {
      toast({ type: "error", message: "Network error" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>Loading round...</span>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="flex items-center justify-center py-20">
        <span style={{ color: "#6a7282" }}>Round not found</span>
      </div>
    );
  }

  const canVoid = !["settled", "settling", "voided"].includes(round.status);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/rounds")}
        className="flex items-center gap-1 text-sm hover:underline"
        style={{ color: "#99a1af" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Rounds
      </button>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white font-mono">
          {round.external_fight_id}
        </h1>
        <StatusBadge
          status={statusToBadge(round.status)}
          label={round.status.replace(/_/g, " ")}
        />
      </div>

      {/* Void success message */}
      {voidResult && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "rgba(240,177,0,0.08)",
            border: "1px solid rgba(240,177,0,0.3)",
          }}
        >
          <p className="text-sm" style={{ color: "#f0b100" }}>
            {voidResult}
          </p>
        </div>
      )}

      {/* Round info */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span style={{ color: "#6a7282" }}>Table</span>
            <p className="text-white mt-0.5">{round.game_name || round.external_game_id}</p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Result</span>
            <p className="mt-0.5 font-semibold" style={{ color: resultColor(round.result) }}>
              {round.result || "\u2014"}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Started</span>
            <p className="text-white mt-0.5">
              {round.started_at
                ? new Date(round.started_at).toLocaleString()
                : "\u2014"}
            </p>
          </div>
          <div>
            <span style={{ color: "#6a7282" }}>Ended</span>
            <p className="text-white mt-0.5">
              {round.ended_at
                ? new Date(round.ended_at).toLocaleString()
                : "\u2014"}
            </p>
          </div>
        </div>
      </div>

      {/* Cards visualization */}
      <RoundCards
        playerCards={round.player_cards}
        bankerCards={round.banker_cards}
        playerScore={round.player_score}
        bankerScore={round.banker_score}
      />

      {/* Bets summary + table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(208,135,0,0.1)" }}
        >
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "#d08700" }}
          >
            Bets ({round.bet_count})
          </h2>
          <span className="text-sm font-mono" style={{ color: "#99a1af" }}>
            Total wagered: {round.total_wagered?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        {round.bets.length === 0 ? (
          <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>
            No bets placed on this round
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}>
                  {["Player", "Bet", "Amount", "Odds", "Payout", "Status"].map(
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
                {round.bets.map((bet) => (
                  <tr
                    key={bet.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td className="px-4 py-3 text-white">
                      {bet.player_username || bet.player_external_id}
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-xs">
                      {bet.team}
                    </td>
                    <td className="px-4 py-3 text-white font-mono">
                      {Number(bet.bet_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "#99a1af" }}>
                      {bet.odds ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{
                      color: bet.payoff && Number(bet.payoff) > 0 ? "#00bc7d" : "#99a1af",
                    }}>
                      {bet.payoff
                        ? Number(bet.payoff).toLocaleString(undefined, { minimumFractionDigits: 2 })
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={betStatusBadge(bet.status)}
                        label={bet.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Void action */}
      {canVoid && (
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
            Actions
          </h2>
          <button
            onClick={() => setShowVoid(true)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "rgba(251,44,54,0.1)",
              color: "#fb2c36",
              border: "1px solid rgba(251,44,54,0.3)",
            }}
          >
            Void Round
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showVoid}
        onClose={() => setShowVoid(false)}
        onConfirm={handleVoid}
        title="Void Round"
        message={`This will void round ${round.external_fight_id} and all ${round.bet_count} associated bet(s). This action cannot be undone.`}
        confirmLabel="Void Round"
        danger
      />
    </div>
  );
}
