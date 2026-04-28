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
  const [tablesRes, operatorsRes] = await Promise.allSettled([
    fetch(`${API_URL}/internal/tables`, { headers }),
    fetch(`${API_URL}/internal/operators`, { headers }),
  ]);

  let activeTables = 0;
  let todayRounds = 0;
  let activeOperators = 0;

  if (tablesRes.status === "fulfilled" && tablesRes.value.ok) {
    const data = await tablesRes.value.json();
    const tables = Array.isArray(data) ? data : data.data ?? data.tables ?? [];
    activeTables = tables.filter(
      (t: Record<string, unknown>) => t.status === "open" || t.is_active
    ).length;
    // Sum up rounds from today if available
    todayRounds = tables.reduce(
      (sum: number, t: Record<string, unknown>) =>
        sum + (Number(t.round_count) || 0),
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

  return NextResponse.json({
    active_tables: activeTables,
    online_players: 0, // placeholder
    today_rounds: todayRounds,
    active_operators: activeOperators,
  });
}
