"use client";

import { useEffect } from "react";
import { useGame, type BetCode, type MainBetCounts } from "./game-context";

/* ------------------------------------------------------------------ */
/*  Backend payload shapes                                             */
/* ------------------------------------------------------------------ */

interface BackendFight {
  id: string;
  external_fight_id: string;
  status: string | null;
  started_at: string | null;
  ends_at: string | null;
  banker_cards: string[];
  player_cards: string[];
  banker_score: number | null;
  player_score: number | null;
  result: string | null;
}

interface TableStatePayload {
  table: { id: string; external_game_id: string; name: string };
  fight: BackendFight | null;
  betting_remaining_seconds: number | null;
  main_bet_counts: Record<
    string,
    { players: number; amount: number }
  > | null;
}

interface ActiveBet {
  bet_id: string;
  external_bet_id: string | null;
  bet_code: string;
  bet_amount: number;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STANDARD_DENOMS = [1000, 500, 100, 50, 25, 10];

/**
 * Pick a chip denomination that visually represents `amount`.
 * We don't store per-chip denominations server-side, so we pick the
 * largest standard chip that fits the bet — the resulting marker is a
 * reasonable visual hint (the real total is shown in the bet total).
 */
function pickDenomForAmount(amount: number): number {
  for (const d of STANDARD_DENOMS) {
    if (amount >= d) return d;
  }
  return STANDARD_DENOMS[STANDARD_DENOMS.length - 1];
}

const VALID_BET_CODES: ReadonlySet<string> = new Set<BetCode>([
  "BAC_Player",
  "BAC_Banker",
  "BAC_Tie",
  "BAC_PlayerPair",
  "BAC_BankerPair",
  "BAC_EitherPair",
  "BAC_PerfectPair",
]);

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * One-shot recovery: on mount, fetch the table's current round state and
 * the player's accepted bets for that round, and hydrate the GameContext
 * so a refresh during a live round doesn't drop the player back to
 * "waiting for next round".
 *
 * The lobby WS continues to drive live updates after this hook completes.
 */
export function useStateRecovery() {
  const {
    token,
    gameId,
    setRoundStatus,
    setCurrentRound,
    setMainBetCounts,
    addStackedChip,
    addPlacedBet,
  } = useGame();

  useEffect(() => {
    if (!gameId) return;
    // Skip recovery for demo mode — there's no server-side round to recover.
    if (token === "demo") return;

    let cancelled = false;

    async function recover() {
      try {
        const stateRes = await fetch(
          `/api/tables/${encodeURIComponent(gameId!)}/state`,
          { cache: "no-store" },
        );
        if (cancelled || !stateRes.ok) return;
        const stateJson = await stateRes.json().catch(() => null);
        if (cancelled || !stateJson || stateJson.error_code !== "0") return;

        const payload = stateJson.data as TableStatePayload | undefined;
        if (!payload) return;

        const fight = payload.fight;
        if (!fight) {
          // Table idle — leave context at default ("waiting").
          return;
        }

        const externalRoundId = fight.external_fight_id;
        const status = fight.status;

        // Hydrate currentRound (cards + scores + countdown).
        const countdown = payload.betting_remaining_seconds ?? undefined;
        setCurrentRound({
          roundId: externalRoundId,
          roundNumber: externalRoundId,
          playerCards: fight.player_cards ?? [],
          bankerCards: fight.banker_cards ?? [],
          playerScore: fight.player_score ?? 0,
          bankerScore: fight.banker_score ?? 0,
          winner: fight.result
            ? (fight.result.charAt(0).toUpperCase() as "P" | "B" | "T")
            : undefined,
          countdown,
        });

        // Map backend status -> client status.
        if (status === "betting_open") {
          setRoundStatus("betting_open");
        } else if (status === "betting_closed" || status === "dealing") {
          setRoundStatus("dealing");
        } else if (
          status === "result" ||
          status === "settling" ||
          status === "settled"
        ) {
          setRoundStatus("result");
        }

        // Hydrate main bet counts (P/T/B aggregate bar).
        if (payload.main_bet_counts) {
          const counts = payload.main_bet_counts;
          const tableId = payload.table?.external_game_id ?? "";
          const next: MainBetCounts = {
            tableId,
            roundId: externalRoundId,
            Player: {
              players: Number(counts.Player?.players ?? 0),
              amount: Number(counts.Player?.amount ?? 0),
            },
            Tie: {
              players: Number(counts.Tie?.players ?? 0),
              amount: Number(counts.Tie?.amount ?? 0),
            },
            Banker: {
              players: Number(counts.Banker?.players ?? 0),
              amount: Number(counts.Banker?.amount ?? 0),
            },
          };
          setMainBetCounts(next);
        }

        // Recover this player's accepted bets for the round so the chip
        // markers + bet totals show up again on refresh.
        if (!token) return;

        // F-10 follow-up: do NOT put session_token in the query string —
        // the HttpOnly prg_session cookie is automatically sent on this
        // same-origin fetch, so the proxy can resolve the player from it
        // without leaking the token via logs/history.
        const betsRes = await fetch(
          `/api/me/active-bets?fight_id=${encodeURIComponent(externalRoundId)}`,
          { cache: "no-store" },
        );
        if (cancelled || !betsRes.ok) return;
        const betsJson = await betsRes.json().catch(() => null);
        if (cancelled || !betsJson || betsJson.error_code !== "0") return;

        const bets = (betsJson.data?.bets ?? []) as ActiveBet[];
        // Per-bet: register a placedBet entry (drives "Total bet" totals)
        // and a stacked chip marker (drives the row of chips on the button).
        // BetStackedChips already dedupes per denomination & caps at 3, so
        // we can safely add one chip per bet without flooding the UI.
        for (const b of bets) {
          if (!VALID_BET_CODES.has(b.bet_code)) continue;
          const code = b.bet_code as BetCode;
          addPlacedBet({ betCode: code, amount: b.bet_amount });
          const denom = pickDenomForAmount(b.bet_amount);
          addStackedChip(code, denom);
        }
      } catch {
        // Silently swallow — the WS will catch up if the recovery fetch fails.
      }
    }

    recover();

    return () => {
      cancelled = true;
    };
    // We intentionally only run once on mount — recovery is a one-shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, token]);
}
