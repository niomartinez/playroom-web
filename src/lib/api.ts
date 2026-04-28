/** Backend API client for the Render-hosted Playroom API. */

import { requireEnv } from "@/lib/server-env";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://staging-api.playroomgaming.ph";
const SERVICE_KEY = requireEnv("API_SERVICE_KEY", "dev-service-key");

/** Server-side fetch with service key auth. */
export async function apiFetch(path: string, init?: RequestInit) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
      ...init?.headers,
    },
  });
  return res.json();
}

/** Client-side fetch (no service key — goes through our API routes). */
export async function clientFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  return res.json();
}
