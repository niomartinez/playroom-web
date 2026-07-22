import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Studio chat history proxy (C3).
 *
 * Forwards the caller's `studio_session` cookie as `X-Studio-Token` (the
 * header the backend studio-auth dependency reads) plus the `X-Service-Key`,
 * mirroring the other `/api/studio/*` proxies. The `?limit` / `?before`
 * cursor query params are passed through untouched.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  const { tableId } = await params;

  const studioToken = req.cookies.get("studio_session")?.value;
  if (!studioToken) {
    return NextResponse.json(
      { error_code: "1001", message: "Not authenticated" },
      { status: 401 },
    );
  }

  const qs = req.nextUrl.searchParams.toString();
  const url =
    `${API_URL}/internal/studio/chat/${encodeURIComponent(tableId)}/history` +
    (qs ? `?${qs}` : "");

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
      "X-Studio-Token": studioToken,
    },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
