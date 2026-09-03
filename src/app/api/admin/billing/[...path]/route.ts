import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/server-env";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/**
 * Passthrough for the billing console.
 *
 * One catch-all rather than eight near-identical files, because every billing
 * route is a straight 1:1 forward. The path is validated against a shape rather
 * than forwarded blind: a catch-all that appends whatever it is given would let
 * `/api/admin/billing/../../users` address the rest of the internal surface
 * with the caller's own admin token attached.
 *
 * Authorisation is NOT decided here. The backend gates every one of these on
 * billing_viewers membership, so this proxy only has to avoid widening what it
 * forwards.
 */
const ALLOWED = /^(invoices|subscription)(\/[A-Za-z0-9._-]+)*$/;

function adminHeaders(req: NextRequest, json = true): Record<string, string> {
  const backendToken = req.cookies.get("admin_backend_token")?.value || "";
  const h: Record<string, string> = { "X-Service-Key": SERVICE_KEY };
  if (json) h["Content-Type"] = "application/json";
  if (backendToken) h["X-Admin-Token"] = backendToken;
  return h;
}

function resolve(path: string[]): string | null {
  const joined = path.join("/");
  if (!ALLOWED.test(joined)) return null;
  return `${API_URL}/internal/admin/billing/${joined}`;
}

async function forward(req: NextRequest, path: string[], method: string) {
  const target = resolve(path);
  if (!target) {
    return NextResponse.json(
      { message: "Not found", data: null },
      { status: 404 },
    );
  }

  const body =
    method === "GET" ? undefined : await req.text().catch(() => undefined);
  const res = await fetch(target + req.nextUrl.search, {
    method,
    headers: adminHeaders(req),
    body: body || undefined,
  });

  // PDFs must not be run through NextResponse.json — the document is the
  // product here, and a JSON round trip would corrupt it silently.
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/pdf")) {
    return new NextResponse(await res.arrayBuffer(), {
      status: res.status,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          res.headers.get("content-disposition") || "inline",
        "Cache-Control": "no-store",
      },
    });
  }

  const data = await res.json().catch(() => ({ message: "Upstream error" }));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return forward(req, (await ctx.params).path, "GET");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return forward(req, (await ctx.params).path, "POST");
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return forward(req, (await ctx.params).path, "PUT");
}
