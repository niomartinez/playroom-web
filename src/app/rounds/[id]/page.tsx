"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import {
  RoundCards,
  resultColor,
  statusToBadge,
  betStatusBadge,
} from "@/components/round/round-display";

interface Bet {
  id: string;
  external_bet_id: string;
  player_username: string;
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
  external_fight_id: string;
  game_name: string;
  external_game_id: string;
  status: string;
  result: string | null;
  banker_cards: string[] | null;
  player_cards: string[] | null;
  banker_score: number | null;
  player_score: number | null;
  started_at: string | null;
  ended_at: string | null;
  bets: Bet[];
  bet_count: number;
  total_wagered: number;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; round: RoundDetail }
  | { kind: "expired" }
  | { kind: "notfound" }
  | { kind: "error" };

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen px-6 text-center">
      <span style={{ color: "#6a7282" }}>{children}</span>
    </div>
  );
}

function PublicRoundContent() {
  const params = useParams();
  const search = useSearchParams();
  const id = params.id as string;

  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const fetchRound = useCallback(async () => {
    setState({ kind: "loading" });
    const qs = new URLSearchParams();
    for (const key of ["username", "brand", "exp", "sig"]) {
      const value = search.get(key);
      if (value !== null) qs.set(key, value);
    }
    try {
      const res = await fetch(`/api/rounds/${id}?${qs.toString()}`);
      if (res.status === 403) return setState({ kind: "expired" });
      if (res.status === 404) return setState({ kind: "notfound" });
      if (!res.ok) return setState({ kind: "error" });
      const json = await res.json();
      const round = (json.data ?? json) as RoundDetail;
      if (!round || !round.external_fight_id) return setState({ kind: "notfound" });
      setState({ kind: "ok", round });
    } catch {
      setState({ kind: "error" });
    }
  }, [id, search]);

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  if (state.kind === "loading") return <Centered>Loading round…</Centered>;
  if (state.kind === "expired")
    return <Centered>This link has expired or is invalid.</Centered>;
  if (state.kind === "notfound") return <Centered>Round not found.</Centered>;
  if (state.kind === "error")
    return <Centered>Something went wrong. Please try again later.</Centered>;

  const round = state.round;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white font-mono">
            {round.external_fight_id}
          </h1>
          <StatusBadge
            status={statusToBadge(round.status)}
            label={round.status.replace(/_/g, " ")}
          />
        </div>

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
              <p className="text-white mt-0.5">
                {round.game_name || round.external_game_id}
              </p>
            </div>
            <div>
              <span style={{ color: "#6a7282" }}>Result</span>
              <p
                className="mt-0.5 font-semibold"
                style={{ color: resultColor(round.result) }}
              >
                {round.result || "—"}
              </p>
            </div>
            <div>
              <span style={{ color: "#6a7282" }}>Started</span>
              <p className="text-white mt-0.5">
                {round.started_at
                  ? new Date(round.started_at).toLocaleString()
                  : "—"}
              </p>
            </div>
            <div>
              <span style={{ color: "#6a7282" }}>Ended</span>
              <p className="text-white mt-0.5">
                {round.ended_at ? new Date(round.ended_at).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Cards */}
        <RoundCards
          playerCards={round.player_cards}
          bankerCards={round.banker_cards}
          playerScore={round.player_score}
          bankerScore={round.banker_score}
        />

        {/* Player's bets */}
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
              Total wagered:{" "}
              {round.total_wagered?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          {round.bets.length === 0 ? (
            <div className="px-6 py-8 text-center" style={{ color: "#6a7282" }}>
              No bets on this round
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(208,135,0,0.15)" }}>
                    {["Bet", "Amount", "Odds", "Payout", "Status"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider"
                        style={{ color: "#d08700" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {round.bets.map((bet) => (
                    <tr
                      key={bet.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <td className="px-4 py-3 text-white font-mono text-xs">
                        {bet.team}
                      </td>
                      <td className="px-4 py-3 text-white font-mono">
                        {Number(bet.bet_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: "#99a1af" }}>
                        {bet.odds ?? "—"}
                      </td>
                      <td
                        className="px-4 py-3 font-mono"
                        style={{
                          color:
                            bet.payoff && Number(bet.payoff) > 0
                              ? "#00bc7d"
                              : "#99a1af",
                        }}
                      >
                        {bet.payoff
                          ? Number(bet.payoff).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                          : "—"}
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
      </div>
    </div>
  );
}

export default function PublicRoundPage() {
  return (
    <Suspense fallback={<Centered>Loading round…</Centered>}>
      <PublicRoundContent />
    </Suspense>
  );
}
