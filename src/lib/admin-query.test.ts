/**
 * The back-office query cache — the contract the whole /admin migration rests on.
 *
 * Run with `npx tsx src/lib/admin-query.test.ts` — the repo has no unit runner
 * (Playwright only), so this is a plain assert script rather than a suite.
 *
 * These exercise the module's cache SEMANTICS directly rather than through
 * React, because that is where the behaviour actually lives and where getting
 * it wrong is expensive: the promise is "revisiting a page shows data instantly
 * and never blanks a table someone is reading". Each case below is one clause
 * of that promise.
 */
import assert from "node:assert/strict";

/* ------------------------------------------------------------------ *
 * A faithful re-implementation of the module's cache internals.
 *
 * admin-query.ts is a "use client" React module: importing it here would pull
 * in React and a DOM. The cache logic is plain data, so it is mirrored here and
 * asserted against. The mirror is kept honest by the last test, which reads the
 * real file and checks the constants and rules it depends on have not drifted.
 * ------------------------------------------------------------------ */
const STALE_MS = 30_000;
const MAX_ENTRIES = 100;

interface Entry {
  data: unknown;
  at: number;
  inflight?: Promise<unknown>;
}

function makeCache() {
  const cache = new Map<string, Entry>();
  let now = 1_000_000;

  const evict = () => {
    if (cache.size <= MAX_ENTRIES) return;
    const byAge = [...cache.entries()].sort((a, b) => a[1].at - b[1].at);
    for (const [k] of byAge.slice(0, cache.size - MAX_ENTRIES)) cache.delete(k);
  };

  return {
    cache,
    advance: (ms: number) => {
      now += ms;
    },
    get now() {
      return now;
    },
    /** Mirrors useAdminQuery's run(): returns how the caller was served. */
    async run(
      url: string,
      fetcher: () => Promise<unknown>,
      force = false,
    ): Promise<"cache" | "shared" | "network" | "kept-stale"> {
      const existing = cache.get(url);
      const fresh = existing && now - existing.at < STALE_MS;
      if (!force && fresh && !existing.inflight) return "cache";

      if (existing?.inflight) {
        await existing.inflight.catch(() => undefined);
        return "shared";
      }

      const p = fetcher();
      cache.set(url, { data: existing?.data, at: existing?.at ?? 0, inflight: p });
      try {
        const data = await p;
        cache.set(url, { data, at: now });
        evict();
        return "network";
      } catch {
        // A failed refresh must never empty a table already on screen.
        if (existing) {
          cache.set(url, { data: existing.data, at: existing.at });
          return "kept-stale";
        }
        cache.delete(url);
        throw new Error("first fetch failed");
      }
    },
    invalidate(prefix: string) {
      for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
    },
    /** What a component would render for this key. */
    peek(url: string) {
      const e = cache.get(url);
      return { data: e?.data, loading: e?.data === undefined };
    },
  };
}

const URL_A = "/api/admin/players?page=1";
const URL_B = "/api/admin/players?page=2";

// Wrapped: the runner compiles to CJS, which rejects top-level await.
async function main() {

/* 1. The core promise: a revisit renders immediately, with no request. */
{
  const c = makeCache();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return { players: ["a"] };
  };

  assert.equal(await c.run(URL_A, fetcher), "network");
  assert.equal(calls, 1);
  assert.equal(c.peek(URL_A).loading, false, "cached key must not report loading");

  // Navigating away and back inside the freshness window.
  assert.equal(await c.run(URL_A, fetcher), "cache");
  assert.equal(calls, 1, "a revisit must not hit the network");
}

/* 2. Past the stale window it refreshes — but the old data stays visible
 *    throughout, which is what stops the screen blanking. */
{
  const c = makeCache();
  const fetcher = async () => ({ v: c.now });
  await c.run(URL_A, fetcher);
  const before = c.peek(URL_A).data;

  c.advance(STALE_MS + 1);
  assert.equal(c.peek(URL_A).data, before, "stale data is still served while refreshing");
  assert.equal(await c.run(URL_A, fetcher), "network");
  assert.notDeepEqual(c.peek(URL_A).data, before, "fresh data swapped in");
}

/* 3. Two components mounting the same key share ONE request. */
{
  const c = makeCache();
  let calls = 0;
  let release: (v: unknown) => void = () => {};
  const fetcher = () => {
    calls++;
    return new Promise((r) => {
      release = r;
    });
  };

  const first = c.run(URL_A, fetcher);
  // Second mount arrives while the first is still in flight.
  const second = c.run(URL_A, fetcher);
  release({ players: [] });
  const [r1, r2] = await Promise.all([first, second]);

  assert.equal(calls, 1, "concurrent mounts must not double-fetch");
  assert.deepEqual([r1, r2].sort(), ["network", "shared"]);
}

/* 4. A failed REFRESH keeps the previous data — the table must not empty
 *    under someone who is reading it. */
{
  const c = makeCache();
  await c.run(URL_A, async () => ({ players: ["kept"] }));
  c.advance(STALE_MS + 1);

  const outcome = await c.run(URL_A, async () => {
    throw new Error("network down");
  });

  assert.equal(outcome, "kept-stale");
  assert.deepEqual(c.peek(URL_A).data, { players: ["kept"] }, "data survived a failed refresh");
}

/* 5. A failed FIRST fetch has nothing to keep, so it must not leave a
 *    poisoned empty entry behind that a later mount would treat as data. */
{
  const c = makeCache();
  await assert.rejects(() => c.run(URL_A, async () => { throw new Error("nope"); }));
  assert.equal(c.cache.has(URL_A), false, "no entry left behind");
  assert.equal(c.peek(URL_A).loading, true, "a later mount still reports loading");
}

/* 6. Different filters are different keys — and going BACK to an earlier
 *    filter is served from cache. This is what URL-persisted filters buy. */
{
  const c = makeCache();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return { page: calls };
  };

  await c.run(URL_A, fetcher);
  await c.run(URL_B, fetcher);
  assert.equal(calls, 2, "distinct filters fetch separately");

  assert.equal(await c.run(URL_A, fetcher), "cache", "returning to page 1 is cached");
  assert.equal(calls, 2);
}

/* 7. A mutation invalidates every view of that resource, not just the one on
 *    screen — a create/void/toggle can change any page or filter. */
{
  const c = makeCache();
  await c.run(URL_A, async () => ({ n: 1 }));
  await c.run(URL_B, async () => ({ n: 2 }));
  await c.run("/api/admin/rounds?page=1", async () => ({ n: 3 }));

  c.invalidate("/api/admin/players");

  assert.equal(c.cache.has(URL_A), false);
  assert.equal(c.cache.has(URL_B), false);
  assert.equal(c.cache.has("/api/admin/rounds?page=1"), true, "other resources untouched");
}

/* 8. Bounded: a long shift paging through records cannot grow it without
 *    limit, and it is the OLDEST entries that go. */
{
  const c = makeCache();
  for (let i = 0; i < MAX_ENTRIES + 10; i++) {
    c.advance(1);
    await c.run(`/api/admin/rounds?page=${i}`, async () => ({ i }));
  }
  assert.equal(c.cache.size, MAX_ENTRIES, "cache stays bounded");
  assert.equal(c.cache.has("/api/admin/rounds?page=0"), false, "oldest evicted");
  assert.equal(
    c.cache.has(`/api/admin/rounds?page=${MAX_ENTRIES + 9}`),
    true,
    "newest retained",
  );
}

/* 9. The mirror above must keep matching the real module. If someone retunes
 *    the constants or drops a rule, these tests would quietly keep passing
 *    against a fiction — so assert the source still says what we modelled. */
{
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("./admin-query.ts", import.meta.url), "utf8");

  assert.match(src, /const STALE_MS = 30_000;/, "STALE_MS drifted from the mirror");
  assert.match(src, /const MAX_ENTRIES = 100;/, "MAX_ENTRIES drifted from the mirror");
  // The rules the tests above encode:
  assert.match(src, /if \(existing\?\.inflight\)/, "request sharing removed");
  assert.match(src, /if \(existing\) cache\.set\(url, \{ data: existing\.data/, "keep-on-failure removed");
  assert.match(src, /else cache\.delete\(url\);/, "first-failure cleanup removed");
  assert.match(src, /entry\?\.data === undefined/, "loading definition changed");
  assert.match(src, /k\.startsWith\(prefix\)/, "prefix invalidation changed");
}

}

main().then(
  () => console.log("admin-query: all cache-contract tests passed"),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
