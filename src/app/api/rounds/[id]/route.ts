import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * GET /api/rounds/[id] — PUBLIC round detail backing the operator/player
 * detail link. No admin token: access is authorised by the signed link, whose
 * params (username, brand, exp, sig) are forwarded to the backend which
 * verifies the signature. The backend status (403 invalid/expired, 404 not
 * found) is passed through so the page can show the right state.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const incoming = req.nextUrl.searchParams;

  // Forward only the link params the backend expects.
  const qs = new URLSearchParams();
  for (const key of ["username", "brand", "exp", "sig"]) {
    const value = incoming.get(key);
    if (value !== null) qs.set(key, value);
  }

  const res = await fetch(
    `${API_URL}/internal/public/round/${encodeURIComponent(id)}?${qs.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": SERVICE_KEY,
      },
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
