import { NextRequest, NextResponse } from "next/server";
import { validateCredentials, createSession, isIpAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // IP check
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  if (!isIpAllowed(clientIp)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, password } = await req.json();

  if (!validateCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSession();

  const res = NextResponse.json({ ok: true });
  res.cookies.set("studio_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12 hours
    path: "/",
  });
  return res;
}
