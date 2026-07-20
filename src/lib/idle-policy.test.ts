/**
 * Threshold resolution for the idle-session rule.
 *
 * Run with `npx tsx src/lib/idle-policy.test.ts` — the repo has no unit
 * runner (Playwright only), so this is a plain assert script rather than a
 * suite. It exists because the thresholds are the kind of number that gets
 * retuned by whoever is in the room, and the clamping rule (a warning at or
 * past the freeze can never fire) is easy to break silently.
 */
import assert from "node:assert/strict";
import { resolveIdlePolicy, DEFAULT_IDLE_POLICY, urlOverrideAllowed } from "./idle-policy";

// Default: one missed round and you're out, no warnings.
{
  const p = resolveIdlePolicy(null, "");
  assert.equal(p.expire, 3, "default freeze is the 3rd idle round");
  assert.equal(p.warn1, 1, "amber warning on the 1st idle round");
  assert.equal(p.warn2, 2, "red warning on the 2nd idle round");
}

// The original BOD ladder is restorable from the URL, no deploy.
{
  const p = resolveIdlePolicy(null, "?idleWarn1=4&idleWarn2=5&idleExpire=6");
  assert.deepEqual(p, { warn1: 4, warn2: 5, expire: 6 });
}

// A warning at or past the freeze can never fire — drop it rather than leave
// a dead rung that looks configured.
{
  const p = resolveIdlePolicy(null, "?idleWarn1=6&idleWarn2=9&idleExpire=6");
  assert.equal(p.warn1, null, "warn1 == expire can never fire");
  assert.equal(p.warn2, null, "warn2 > expire can never fire");
  assert.equal(p.expire, 6);
}

// Junk must fall back, never throw or produce NaN/0 (a 0 would freeze the
// player instantly, on the first round they ever see).
for (const junk of ["0", "-3", "abc", "", "1.5", "1e9999"]) {
  const p = resolveIdlePolicy(null, `?idleExpire=${encodeURIComponent(junk)}`);
  assert.equal(
    p.expire,
    DEFAULT_IDLE_POLICY.expire,
    `junk idleExpire=${junk!} should fall back to the default, got ${p.expire}`,
  );
}

// A longer ladder keeps its warnings.
{
  const p = resolveIdlePolicy(null, "?idleExpire=3&idleWarn1=1&idleWarn2=2");
  assert.deepEqual(p, { warn1: 1, warn2: 2, expire: 3 });
}

// PROD LOCK: the URL override must be refused on the production API host, and
// honoured on staging / localhost. This is the whole point — a player must not
// be able to disable their own idle freeze from the address bar in prod.
assert.equal(urlOverrideAllowed("https://api.playroomgaming.ph"), false, "prod must ignore the URL override");
assert.equal(urlOverrideAllowed("https://staging-api.playroomgaming.ph"), true, "staging honours the override");
assert.equal(urlOverrideAllowed("http://localhost:3100"), true, "localhost honours the override");
assert.equal(urlOverrideAllowed("https://weird-unknown-host.example"), false, "unknown host fails closed to prod");

// Server value is the authority: with a server policy of expire 5, the base
// (no URL) resolves to 5.
{
  const p = resolveIdlePolicy({ expire: 5, warn1: 3, warn2: 4 }, "");
  assert.deepEqual(p, { warn1: 3, warn2: 4, expire: 5 });
}

console.log("idle-policy: all assertions passed");
