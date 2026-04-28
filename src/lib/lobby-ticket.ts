/**
 * F-06: Client helper to fetch a short-lived `/ws/lobby` ticket.
 *
 * Replaces the per-tab inlining of `NEXT_PUBLIC_API_KEY` in the WS URL.
 * Every WS connection (including reconnects) calls this first to get a
 * fresh single-use ticket. The previous ticket may already have been
 * consumed (single-use semantics) or expired (5 minute TTL), so we
 * always mint anew rather than caching.
 *
 * Returns `null` on failure — callers should treat that as "not authed
 * yet" and back off until the next reconnect attempt.
 */
export async function fetchLobbyTicket(
  tableId?: string,
): Promise<string | null> {
  try {
    const res = await fetch("/api/lobby-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Body is optional — backend treats `table_id: undefined` as
      // "no table scoping". We still POST a JSON body so any future
      // CSRF middleware that requires `Content-Type: application/json`
      // doesn't reject the request.
      body: JSON.stringify(tableId ? { table_id: tableId } : {}),
      // Same-origin: cookie is sent automatically.
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ticket?: string };
    return data.ticket ?? null;
  } catch {
    return null;
  }
}
