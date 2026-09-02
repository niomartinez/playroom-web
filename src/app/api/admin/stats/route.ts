import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

export async function GET(req: NextRequest) {
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
  if (backendToken) headers["X-Admin-Token"] = backendToken;

  // Aggregate stats from multiple endpoints
  const [tablesRes, operatorsRes, dashboardRes] = await Promise.allSettled([
    // env_scoped: the "active tables" tile counts what /admin/tables shows,
    // so prod must not inflate the number with TEST-* fixtures.
    fetch(`${API_URL}/internal/tables?env_scoped=true`, { headers }),
    fetch(`${API_URL}/internal/operators`, { headers }),
    // Manila-day round count + exact unique-player figures.
    fetch(`${API_URL}/internal/admin/dashboard/stats`, { headers }),
  ]);

  let activeTables = 0;
  let todayRounds = 0;
  let activeOperators = 0;
  let onlinePlayers = 0;
  let uniqueLifetime = 0;
  let uniqueToday = 0;
  let unique7d = 0;
  let unique30d = 0;
  let new30d = 0;
  let returning30d = 0;
  let playerStatsAvailable = false;
  let topSites: unknown[] = [];
  let ngrToday = 0;
  let ngr30d = 0;
  let ngrRate: number | null = null;

  if (tablesRes.status === "fulfilled" && tablesRes.value.ok) {
    const data = await tablesRes.value.json();
    const tables = Array.isArray(data) ? data : data.data ?? data.tables ?? [];
    activeTables = tables.filter(
      (t: Record<string, unknown>) => t.status === "open" || t.is_active
    ).length;
    // player_count is computed live by the backend from stream_sessions
    // heartbeats. This tile was hardcoded to 0 and never asked for a real
    // number, so it read empty even with players seated on the table.
    onlinePlayers = tables.reduce(
      (sum: number, t: Record<string, unknown>) =>
        sum + (Number(t.player_count) || 0),
      0
    );
  }

  if (operatorsRes.status === "fulfilled" && operatorsRes.value.ok) {
    const data = await operatorsRes.value.json();
    const operators = Array.isArray(data)
      ? data
      : data.data ?? data.operators ?? [];
    activeOperators = operators.filter(
      (o: Record<string, unknown>) => o.is_active
    ).length;
  }

  // Rounds and player counts come from the backend, which resolves Manila days
  // server-side. They used to be derived here: today_rounds summed a
  // `round_count` field that does not exist on games and was never selected, so
  // the tile was permanently 0.
  if (dashboardRes.status === "fulfilled" && dashboardRes.value.ok) {
    const body = await dashboardRes.value.json();
    const d = body.data ?? body;
    todayRounds = Number(d.today_rounds) || 0;
    uniqueLifetime = Number(d.unique_players_lifetime) || 0;
    uniqueToday = Number(d.unique_players_today) || 0;
    unique7d = Number(d.unique_players_7d) || 0;
    unique30d = Number(d.unique_players_30d) || 0;
    new30d = Number(d.new_players_30d) || 0;
    returning30d = Number(d.returning_players_30d) || 0;
    playerStatsAvailable = d.player_stats_available !== false;
    // Best-effort on the backend too — an empty array means the breakdown
    // failed or there is nothing to show, and the tile hides itself either way.
    topSites = Array.isArray(d.top_sites) ? d.top_sites : [];
    // Our revenue share. Computed backend-side per SITE and floored at zero
    // there, so this is a pass-through: deriving it here from a GGR figure
    // would net losing sites off against winning ones and understate it.
    ngrToday = Number(d.ngr_today) || 0;
    ngr30d = Number(d.ngr_30d) || 0;
    ngrRate = d.ngr_rate == null ? null : Number(d.ngr_rate);
  }

  return NextResponse.json({
    active_tables: activeTables,
    online_players: onlinePlayers,
    today_rounds: todayRounds,
    active_operators: activeOperators,
    top_sites: topSites,
    ngr_today: ngrToday,
    ngr_30d: ngr30d,
    ngr_rate: ngrRate,
    unique_players_lifetime: uniqueLifetime,
    unique_players_today: uniqueToday,
    unique_players_7d: unique7d,
    unique_players_30d: unique30d,
    new_players_30d: new30d,
    returning_players_30d: returning30d,
    // False => the backend could not produce player figures. The dashboard
    // hides those tiles rather than showing a confident, wrong zero.
    player_stats_available: playerStatsAvailable,
  });
}
