import { NextRequest, NextResponse } from "next/server";
import { verifyOcmsSession } from "@/lib/ocms-auth";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

export async function GET(req: NextRequest) {
  const token = req.cookies.get("ocms_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await verifyOcmsSession(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Prefer fresh data from backend (role/is_active/operator_id may change).
  const backendToken = req.cookies.get("ocms_token")?.value;
  if (backendToken) {
    try {
      const res = await fetch(`${API_URL}/internal/ocms/me`, {
        headers: {
          "Content-Type": "application/json",
          "X-Service-Key": SERVICE_KEY,
          "X-Admin-Token": backendToken,
        },
      });
      if (res.ok) {
        const raw = await res.json();
        // Backend wraps in BaseResponse { error_code, message, data: {...} }.
        return NextResponse.json(raw.data || raw);
      }
    } catch {
      // Fall through to local payload.
    }
  }

  return NextResponse.json({
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    display_name: payload.display_name,
    operator_id: payload.operator_id,
  });
}
