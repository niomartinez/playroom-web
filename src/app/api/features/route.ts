import { NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";

/** GET /api/features — public feature flags (no auth). */
export async function GET() {
  try {
    const res = await fetch(`${API_URL}/public/features`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    /* Network / upstream failure — degrade gracefully to defaults so the
       player UI keeps working instead of flashing unexpected features. */
    return NextResponse.json(
      { error_code: "0", message: "Fallback defaults", data: { live_chat_enabled: false } },
      { status: 200 },
    );
  }
}
