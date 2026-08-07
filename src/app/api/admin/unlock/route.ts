import { NextRequest, NextResponse } from "next/server";
import {
  BYPASS_COOKIE,
  BYPASS_TTL_SECONDS,
  configuredCode,
  mintBypass,
  verifyCode,
} from "@/lib/break-glass";

/**
 * Break-glass unlock. NOT IP-gated (see ipGateSurface in proxy.ts) — it has to
 * be reachable from exactly the network the gate is refusing.
 *
 * POST, never GET: a code in a query string ends up in browser history, the
 * referrer header and Vercel's access logs. A form body ends up in none of them.
 *
 * Grants nothing but reachability. Behind this the admin password, the role
 * matrix and every session check are unchanged.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

/** Best-effort audit row. Never blocks the unlock: being unable to WRITE the
 *  log must not be the reason someone stays locked out. */
async function recordUse(ip: string, ok: boolean): Promise<void> {
  const serviceKey = process.env.API_SERVICE_KEY;
  if (!serviceKey) return;
  try {
    await fetch(`${API_URL}/internal/break-glass-used`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": serviceKey,
      },
      body: JSON.stringify({ ip_address: ip, success: ok }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    /* logged at the edge regardless — see console below */
  }
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  if (!configuredCode()) {
    return NextResponse.json(
      {
        error:
          "Break-glass is not configured on this deployment. Ask the dev team " +
          "to add your IP to the allowlist.",
      },
      { status: 503 },
    );
  }

  let code = "";
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    code = typeof body?.code === "string" ? body.code : "";
  } else {
    const form = await req.formData().catch(() => null);
    code = typeof form?.get("code") === "string" ? String(form.get("code")) : "";
  }

  if (!verifyCode(code)) {
    // Loud on failure: a wrong code from an unlisted IP is either someone who
    // needs help or someone who should not be here, and both are worth seeing.
    console.warn(`[break-glass] REJECTED unlock attempt from ${ip || "unknown"}`);
    await recordUse(ip, false);
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Server is missing ADMIN_JWT_SECRET; cannot issue an unlock." },
      { status: 500 },
    );
  }

  const token = await mintBypass(secret, ip);
  console.warn(
    `[break-glass] UNLOCKED ${ip || "unknown"} for ${BYPASS_TTL_SECONDS}s`,
  );
  await recordUse(ip, true);

  const res = NextResponse.json({ ok: true, ip, expires_in: BYPASS_TTL_SECONDS });
  res.cookies.set(BYPASS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: BYPASS_TTL_SECONDS,
  });
  return res;
}
