import { NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = process.env.API_SERVICE_KEY || "";

export async function GET() {
  const res = await fetch(`${API_URL}/internal/tables`, {
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
    },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
