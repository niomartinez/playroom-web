import { NextRequest, NextResponse } from "next/server";
import { createAdminSession } from "@/lib/admin-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://topless-casino-api.onrender.com";
const SERVICE_KEY = process.env.API_SERVICE_KEY || "";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Proxy to backend admin login endpoint
  const backendRes = await fetch(`${API_URL}/internal/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok) {
    const errData = await backendRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: errData.detail || errData.error || "Invalid credentials" },
      { status: backendRes.status }
    );
  }

  const rawData = await backendRes.json();
  // Backend wraps response in BaseResponse: { error_code, message, data: { ... } }
  const data = rawData.data || rawData;

  const token = await createAdminSession({
    sub: data.admin_id || data.id || data.user_id || "",
    email: data.email || "",
    role: data.role || "viewer",
    display_name: data.display_name || data.name || "",
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12 hours
    path: "/",
  });

  // Also store the backend token for forwarding to API calls
  if (data.token) {
    res.cookies.set("admin_backend_token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12,
      path: "/",
    });
  }

  return res;
}
