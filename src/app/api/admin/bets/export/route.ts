import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_backend_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const response = await fetch(`${API_URL}/internal/admin/bets/export?${req.nextUrl.searchParams}`, {
    headers: { "X-Service-Key": SERVICE_KEY, "X-Admin-Token": token },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Export failed" }));
    return NextResponse.json(body, { status: response.status });
  }
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bet-log.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
