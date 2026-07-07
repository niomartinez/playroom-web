/** OCMS server-only data helpers (Pattern B — RSC data fetching).
 *
 * These functions run ONLY in React Server Components / route handlers. They
 * read the httpOnly `ocms_token` cookie and the server-side API service key,
 * then call the backend /internal/ocms/* endpoints directly — no client
 * round-trip, no useEffect, no blank-screen waterfall.
 *
 * SECURITY: this module MUST NEVER be imported by a "use client" file. The
 * service key (API_SERVICE_KEY) would then be bundled into the browser. It
 * reads cookies() from next/headers, which already pins it to the server, and
 * every backend query is hard-scoped to the token's operator_id backend-side
 * (verify_ocms_token) — the tenant scope is preserved through the RSC rework.
 *
 * Client-side mutations (login / logout / change-password / reset / create)
 * keep going through the existing /api/admin-ocms/* proxy routes.
 */

import { cookies } from "next/headers";
import { requireEnv } from "@/lib/server-env";
import { OCMS_TOKEN_COOKIE } from "@/lib/ocms-auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";

/** Build the backend headers, forwarding the caller's operator-scoped token. */
async function ocmsHeaders(): Promise<Record<string, string>> {
  const jar = await cookies();
  const backendToken = jar.get(OCMS_TOKEN_COOKIE)?.value || "";
  const serviceKey = requireEnv("API_SERVICE_KEY", "dev-service-key");
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Service-Key": serviceKey,
  };
  if (backendToken) h["X-Admin-Token"] = backendToken;
  return h;
}

/** GET a backend /internal/ocms/* endpoint and unwrap the BaseResponse
 *  envelope ({ error_code, message, data }). Returns `data` (or the raw body
 *  if it is not wrapped). Never throws for a non-2xx — returns `null` so the
 *  RSC can render an empty/last-known state instead of crashing the route. */
async function ocmsGet<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<T | null> {
  const qs = new URLSearchParams();
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  let res: Response;
  try {
    res = await fetch(`${API_URL}/internal/ocms/${path}${suffix}`, {
      headers: await ocmsHeaders(),
      // Always dynamic — this is authenticated, per-operator data.
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const raw = await res.json().catch(() => null);
  if (raw == null) return null;
  return (raw.data ?? raw) as T;
}

/* ------------------------------------------------------------------ */
/*  Typed shapes (mirror the client-side interfaces they replace)      */
/* ------------------------------------------------------------------ */

export interface OcmsSummary {
  total_wagered: number;
  total_payout: number;
  ggr: number;
  bet_count: number;
  date_from?: string;
  date_to?: string;
}

export interface OcmsMonthlyRow {
  month: string;
  total_wagered: number;
  total_payout: number;
  ggr: number;
  bet_count: number;
}

export interface OcmsPlayer {
  id: string;
  external_user_id: string;
  username: string;
  balance: number;
  currency_code: string;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface OcmsPlayersPage {
  players: OcmsPlayer[];
  total: number;
  page: number;
  page_size: number;
}

export interface OcmsPlayerDetail {
  id: string;
  external_user_id: string;
  username: string;
  balance: number;
  currency_code: string;
  is_active: boolean;
  operator_id: string;
  operator_name?: string;
  created_at: string;
  updated_at: string;
  stats: {
    total_bets: number;
    total_wagered: number;
    total_payout: number;
    net_result: number;
    settled_bets: number;
  };
}

export interface OcmsTransaction {
  id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  bet_id: string | null;
  created_at: string;
}

export interface OcmsTransactionsPage {
  transactions: OcmsTransaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface OcmsCsUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Public fetchers                                                     */
/* ------------------------------------------------------------------ */

export function getReportSummary(
  dateFrom?: string,
  dateTo?: string,
): Promise<OcmsSummary | null> {
  return ocmsGet<OcmsSummary>("reports/summary", {
    date_from: dateFrom,
    date_to: dateTo,
  });
}

export async function getReportMonthly(
  months = 12,
): Promise<OcmsMonthlyRow[]> {
  const data = await ocmsGet<OcmsMonthlyRow[]>("reports/monthly", { months });
  return Array.isArray(data) ? data : [];
}

export async function getPlayers(params: {
  page?: number;
  page_size?: number;
  search?: string;
}): Promise<OcmsPlayersPage> {
  const data = await ocmsGet<OcmsPlayersPage>("players", {
    page: params.page,
    page_size: params.page_size,
    search: params.search,
  });
  return data ?? { players: [], total: 0, page: params.page ?? 1, page_size: params.page_size ?? 20 };
}

export function getPlayerDetail(
  id: string,
): Promise<OcmsPlayerDetail | null> {
  return ocmsGet<OcmsPlayerDetail>(`player/${id}`);
}

export async function getPlayerTransactions(
  id: string,
  page = 1,
  pageSize = 15,
): Promise<OcmsTransactionsPage> {
  const data = await ocmsGet<OcmsTransactionsPage>(
    `player/${id}/transactions`,
    { page, page_size: pageSize },
  );
  return data ?? { transactions: [], total: 0, page, page_size: pageSize };
}

export async function getCsUsers(): Promise<OcmsCsUser[]> {
  const data = await ocmsGet<OcmsCsUser[]>("cs-users");
  return Array.isArray(data) ? data : [];
}
