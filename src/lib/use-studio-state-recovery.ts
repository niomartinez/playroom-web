"use client";

import { useEffect } from "react";
import { useStudio } from "./studio-context";

/* ------------------------------------------------------------------ */
/*  Backend payload shapes (mirror of player-side)                     */
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
  main_bet_counts: Record<string, { players: number; amount: number }> | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Studio-side one-shot recovery on mount: re-hydrates the studio dashboard
 * after a refresh during a live round so the dealer doesn't see "NEW ROUND
 * ENABLED" while the round is actually still betting / dealing server-side.
 *
 * The studio doesn't need per-player bet recovery — only round status,
 * cards already dealt, and the betting countdown.
 */
export function useStudioStateRecovery() {
  const {
    tableId,
    setRoundStatus,
    setCurrentRound,
    setLastUpdated,
  } = useStudio();

  useEffect(() => {
    if (!tableId) return;
    let cancelled = false;

    async function recover() {
      try {
        const res = await fetch(
          `/api/tables/${encodeURIComponent(tableId!)}/state`,
          { cache: "no-store" },
        );
        if (cancelled || !res.ok) return;
        const json = await res.json().catch(() => null);
        if (cancelled || !json || json.error_code !== "0") return;

        const payload = json.data as TableStatePayload | undefined;
        if (!payload) return;

        const fight = payload.fight;
        if (!fight) return;

        const status = fight.status;
        const externalRoundId = fight.external_fight_id;

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
          countdown: payload.betting_remaining_seconds ?? undefined,
        });

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

        const now = new Date();
        setLastUpdated(now.toLocaleTimeString("en-US", { hour12: false }));
      } catch {
        // WS will catch up if the recovery fetch fails.
      }
    }

    recover();

    return () => {
      cancelled = true;
    };
    // One-shot on mount; tableId is the only dependency that should retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);
}
