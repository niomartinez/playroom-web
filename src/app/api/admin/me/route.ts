import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { requireEnv } from "@/lib/server-env";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await verifyAdminSession(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Also try to get fresh data from backend
  const backendToken = req.cookies.get("admin_backend_token")?.value;
  if (backendToken) {
    try {
      const res = await fetch(`${API_URL}/internal/admin/me`, {
        headers: {
          "Content-Type": "application/json",
          "X-Service-Key": SERVICE_KEY,
          "X-Admin-Token": backendToken,
        },
      });
      if (res.ok) {
        const raw = await res.json();
        // Backend wraps in BaseResponse { error_code, message, data: {...} } —
        // returning the wrapper made the UI fall back to role "viewer".
        return NextResponse.json(raw.data || raw);
      }
    } catch {
      // Fall through to local payload
    }
  }

  // Return data from the JWT payload
  return NextResponse.json({
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    display_name: payload.display_name,
  });
}
