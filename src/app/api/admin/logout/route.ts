import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_session");
  res.cookies.delete("admin_backend_token");
  return res;
}
