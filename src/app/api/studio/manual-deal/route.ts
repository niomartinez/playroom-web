import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Retry a step of the round chain through transient backend failures.
 *
 * The four calls below (active -> deal -> result -> settle) are separate HTTP
 * requests with no transaction around them, so a single blip between any two
 * strands the round: the studio aborts, and a round parked in `result` is not
 * reported by /internal/fights/active, so the dealer cannot even retry it. On
 * 2026-07-27 one transient 500 on `result` stopped the live table for 31
 * minutes.
 *
 * Only 5xx and network errors are retried. A 4xx is the backend saying no —
 * repeating it just wastes the dealer's time.
 *
 * Every step here is idempotent, which is what makes retrying safe: `deal`
 * writes the same cards, `result` writes the same outcome, and `settle` only
 * looks at ACCEPTED bets, of which a settled round has none. That matters
 * because a request can fail AFTER its write landed — the 2026-07-27 round was
 * marked `result` by the very call that returned 500.
 */
const RETRIES = 3;
const RETRY_DELAY_MS = 400;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status < 500) return res; // includes every success and every 4xx
      lastErr = new Error(`${label}: HTTP ${res.status}`);
      if (attempt === RETRIES) return res;
    } catch (e) {
      lastErr = e;
      if (attempt === RETRIES) throw e;
    }
    console.warn(
      `[studio/manual-deal] ${label} attempt ${attempt}/${RETRIES} failed, retrying:`,
      lastErr,
    );
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
  }
  // Unreachable — the loop either returns or throws on its last attempt.
  throw lastErr ?? new Error(`${label}: exhausted retries`);
}

/**
 * Studio manual card input — deals cards into the active round,
 * sets the result, and triggers settlement.
 *
 * Expects: { game_id, player_cards, banker_cards, player_score, banker_score, outcome, player_pair, banker_pair }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { game_id, player_cards, banker_cards, player_score, banker_score, outcome, player_pair, banker_pair } = body;

  // A valid studio session is REQUIRED — this route deals cards, sets the
  // result, and settles. Without this check an unauthenticated caller could
  // drive settlement via the trusted service key (2026-07-22 hardening).
  const studioToken = req.cookies.get("studio_session")?.value;
  if (!studioToken) {
    return NextResponse.json(
      { error_code: "1001", message: "Not authenticated" },
      { status: 401 },
    );
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
    "X-Studio-Token": studioToken,
  };

  // Step 1: Find the active round on this table
  const activeRes = await fetchWithRetry(
    `${API_URL}/internal/fights/active/${game_id}`,
    { headers },
    "active",
  );
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
  const dealRes = await fetchWithRetry(
    `${API_URL}/internal/round/${fightId}/deal`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ player_cards, banker_cards, player_score, banker_score }),
    },
    "deal",
  );
  if (!dealRes.ok) {
    const err = await dealRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.message || "Failed to deal cards" },
      { status: dealRes.status },
    );
  }

  // Step 3: Set result
  const resultRes = await fetchWithRetry(
    `${API_URL}/internal/round/${fightId}/result`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        outcome,
        round_details: { source: "manual", player_pair, banker_pair },
      }),
    },
    "result",
  );
  if (!resultRes.ok) {
    const err = await resultRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.message || "Failed to set result" },
      { status: resultRes.status },
    );
  }

  // Step 4: Settle
  const settleRes = await fetchWithRetry(
    `${API_URL}/internal/round/${fightId}/settle`,
    { method: "POST", headers },
    "settle",
  );

  const settleData = await settleRes.json().catch(() => ({}));

  // A failed settle must surface as an error — returning ok:true here left
  // the studio UI believing the round settled when it hadn't.
  if (!settleRes.ok || (settleData.error_code && settleData.error_code !== "0")) {
    return NextResponse.json(
      { error: settleData.message || "Failed to settle round" },
      { status: settleRes.ok ? 400 : settleRes.status },
    );
  }

  return NextResponse.json({
    ok: true,
    fight_id: fightId,
    outcome,
    settlement: settleData.data || settleData,
  });
}
