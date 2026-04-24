import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = process.env.API_SERVICE_KEY || "";

/**
 * Studio manual card input — deals cards into the active round,
 * sets the result, and triggers settlement.
 *
 * Expects: { game_id, player_cards, banker_cards, player_score, banker_score, outcome, player_pair, banker_pair }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { game_id, player_cards, banker_cards, player_score, banker_score, outcome, player_pair, banker_pair } = body;

  const headers = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };

  // Step 1: Find the active round on this table
  const activeRes = await fetch(`${API_URL}/internal/fights/active/${game_id}`, {
    headers,
  });
  if (!activeRes.ok) {
    return NextResponse.json(
      { error: "No active round found. Click 'NEW ROUND' first." },
      { status: 400 },
    );
  }
  const activeData = await activeRes.json();
  const fightId = activeData.data?.fight_id || activeData.data?.id;
  if (!fightId) {
    return NextResponse.json(
      { error: "No active round found. Click 'NEW ROUND' first." },
      { status: 400 },
    );
  }

  // Step 2: Deal cards into the round
  const dealRes = await fetch(`${API_URL}/internal/round/${fightId}/deal`, {
    method: "POST",
    headers,
    body: JSON.stringify({ player_cards, banker_cards, player_score, banker_score }),
  });
  if (!dealRes.ok) {
    const err = await dealRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.message || "Failed to deal cards" },
      { status: dealRes.status },
    );
  }

  // Step 3: Set result
  const resultRes = await fetch(`${API_URL}/internal/round/${fightId}/result`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      outcome,
      round_details: { source: "manual", player_pair, banker_pair },
    }),
  });
  if (!resultRes.ok) {
    const err = await resultRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.message || "Failed to set result" },
      { status: resultRes.status },
    );
  }

  // Step 4: Settle
  const settleRes = await fetch(`${API_URL}/internal/round/${fightId}/settle`, {
    method: "POST",
    headers,
  });

  const settleData = await settleRes.json().catch(() => ({}));

  return NextResponse.json({
    ok: true,
    fight_id: fightId,
    outcome,
    settlement: settleData.data || settleData,
  });
}
