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
import { resolveIdlePolicy, DEFAULT_IDLE_POLICY } from "./idle-policy";

// Default: one missed round and you're out, no warnings.
{
  const p = resolveIdlePolicy("");
  assert.equal(p.expire, 1, "default freeze should be 1 idle round");
  assert.equal(p.warn1, null, "warnings must be off at expire=1");
  assert.equal(p.warn2, null, "warnings must be off at expire=1");
}

// The original BOD ladder is restorable from the URL, no deploy.
{
  const p = resolveIdlePolicy("?idleWarn1=4&idleWarn2=5&idleExpire=6");
  assert.deepEqual(p, { warn1: 4, warn2: 5, expire: 6 });
}

// A warning at or past the freeze can never fire — drop it rather than leave
// a dead rung that looks configured.
{
  const p = resolveIdlePolicy("?idleWarn1=6&idleWarn2=9&idleExpire=6");
  assert.equal(p.warn1, null, "warn1 == expire can never fire");
  assert.equal(p.warn2, null, "warn2 > expire can never fire");
  assert.equal(p.expire, 6);
}

// Junk must fall back, never throw or produce NaN/0 (a 0 would freeze the
// player instantly, on the first round they ever see).
for (const junk of ["0", "-3", "abc", "", "1.5", "1e9999"]) {
  const p = resolveIdlePolicy(`?idleExpire=${encodeURIComponent(junk)}`);
  assert.equal(
    p.expire,
    DEFAULT_IDLE_POLICY.expire,
    `junk idleExpire=${junk!} should fall back to the default, got ${p.expire}`,
  );
}

// A longer ladder keeps its warnings.
{
  const p = resolveIdlePolicy("?idleExpire=3&idleWarn1=1&idleWarn2=2");
  assert.deepEqual(p, { warn1: 1, warn2: 2, expire: 3 });
}

console.log("idle-policy: all assertions passed");
