/**
 * Client-safe fetch helper for hitting our own Next.js /api/* routes.
 *
 * Server-side calls to the FastAPI backend (which need X-Service-Key)
 * happen inside individual route handlers under src/app/api/, where each
 * route imports requireEnv from server-env.ts directly. Don't add a
 * server-side helper here - it would pull server-env into the client
 * bundle (any client component importing clientFetch loads the whole
 * module).
 */

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
