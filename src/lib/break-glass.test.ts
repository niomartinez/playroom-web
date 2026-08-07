/**
 * Break-glass. This decides who gets past the network gate, so the failure
 * modes point in opposite directions and both are bad: too strict and the
 * person it exists for stays locked out, too loose and it is a backdoor.
 *
 * Run with `npx tsx src/lib/break-glass.test.ts` — the repo has no unit runner
 * (Playwright only), so this is a plain assert script rather than a suite.
 */
import assert from "node:assert/strict";
import {
  MIN_CODE_LENGTH,
  configuredCode,
  isEnabled,
  mintBypass,
  safeEqual,
  verifyBypass,
  verifyCode,
} from "./break-glass";

const SECRET = "test-admin-jwt-secret-at-least-32-chars-long";
const GOOD = "a".repeat(MIN_CODE_LENGTH) + "-real-code";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

function withCode<T>(code: string | undefined, fn: () => T): T {
  const prev = process.env.BREAK_GLASS_CODE;
  if (code === undefined) delete process.env.BREAK_GLASS_CODE;
  else process.env.BREAK_GLASS_CODE = code;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.BREAK_GLASS_CODE;
    else process.env.BREAK_GLASS_CODE = prev;
  }
}

(async () => {
  console.log("configuration");

  await check("disabled when unset — no env var, no bypass", () => {
    withCode(undefined, () => {
      assert.equal(isEnabled(), false);
      assert.equal(configuredCode(), null);
      assert.equal(verifyCode("anything"), false);
      assert.equal(verifyCode(""), false);
    });
  });

  await check("a short code is REFUSED, not honoured", () => {
    // A 6-digit code would be guessable and would sit there looking configured.
    withCode("123456", () => {
      assert.equal(isEnabled(), false);
      assert.equal(verifyCode("123456"), false);
    });
  });

  await check("a long code is accepted", () => {
    withCode(GOOD, () => {
      assert.equal(isEnabled(), true);
      assert.equal(verifyCode(GOOD), true);
      assert.equal(verifyCode(GOOD + "x"), false);
      assert.equal(verifyCode(GOOD.slice(0, -1)), false);
      assert.equal(verifyCode(null), false);
      assert.equal(verifyCode(undefined), false);
    });
  });

  console.log("constant-time compare");

  await check("safeEqual agrees with === on equality", () => {
    assert.equal(safeEqual("abc", "abc"), true);
    assert.equal(safeEqual("abc", "abd"), false);
    assert.equal(safeEqual("abc", "ab"), false);
    assert.equal(safeEqual("", ""), true);
  });

  console.log("bypass cookie");

  await check("a freshly minted bypass verifies for its own IP", async () => {
    const token = await mintBypass(SECRET, "175.176.58.219");
    assert.equal(await verifyBypass(SECRET, token, "175.176.58.219"), true);
  });

  await check("a stolen cookie does NOT work from another IP", async () => {
    // The IP is inside the signature, so the cookie is not a portable
    // credential — copying it out of the browser buys nothing.
    const token = await mintBypass(SECRET, "175.176.58.219");
    assert.equal(await verifyBypass(SECRET, token, "8.8.8.8"), false);
  });

  await check("a bypass signed with a different secret is refused", async () => {
    const token = await mintBypass("some-other-secret-value-32-chars-x", "1.2.3.4");
    assert.equal(await verifyBypass(SECRET, token, "1.2.3.4"), false);
  });

  await check("garbage, empty and missing tokens are refused", async () => {
    assert.equal(await verifyBypass(SECRET, "not-a-jwt", "1.2.3.4"), false);
    assert.equal(await verifyBypass(SECRET, "", "1.2.3.4"), false);
    assert.equal(await verifyBypass(SECRET, null, "1.2.3.4"), false);
    assert.equal(await verifyBypass(SECRET, undefined, "1.2.3.4"), false);
  });

  await check("no client IP means no bypass", async () => {
    const token = await mintBypass(SECRET, "1.2.3.4");
    assert.equal(await verifyBypass(SECRET, token, ""), false);
    assert.equal(await verifyBypass(SECRET, token, null), false);
  });

  await check("an expired bypass is refused", async () => {
    // Sign one that expired an hour ago, the same way mintBypass does.
    const { SignJWT } = await import("jose");
    const key = new TextEncoder().encode(SECRET);
    const expired = await new SignJWT({ ip: "1.2.3.4", kind: "break-glass" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(key);
    assert.equal(await verifyBypass(SECRET, expired, "1.2.3.4"), false);
  });

  await check("a token of the wrong KIND is refused", async () => {
    // An admin session JWT is signed with this same secret. It must not double
    // as a gate bypass, or any leaked session cookie would become one.
    const { SignJWT } = await import("jose");
    const key = new TextEncoder().encode(SECRET);
    const session = await new SignJWT({ ip: "1.2.3.4", role: "superadmin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(key);
    assert.equal(await verifyBypass(SECRET, session, "1.2.3.4"), false);
  });

  console.log(`\n${passed} checks passed`);
})();
