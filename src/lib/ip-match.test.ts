/**
 * The edge gate's matcher. This code decides whether a person can reach the
 * back office at all, so both directions matter equally: a false negative is a
 * lockout, a false positive is an open door.
 *
 * Run with `npx tsx src/lib/ip-match.test.ts` — the repo has no unit runner
 * (Playwright only), so this is a plain assert script rather than a suite.
 */
import assert from "node:assert/strict";
import { makeIpMatcher } from "./ip-match";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

console.log("exact addresses (unchanged behaviour)");

check("matches an exact entry", () => {
  const m = makeIpMatcher(["112.201.70.246"]);
  assert.equal(m.test("112.201.70.246"), true);
  assert.equal(m.test("112.201.70.247"), false);
});

check("empty list reports itself empty", () => {
  assert.equal(makeIpMatcher([]).isEmpty, true);
  assert.equal(makeIpMatcher(["  ", ""]).isEmpty, true);
  assert.equal(makeIpMatcher(["1.2.3.4"]).isEmpty, false);
});

check("null / undefined / empty client IP never matches", () => {
  const m = makeIpMatcher(["1.2.3.4", "0.0.0.0/0"]);
  assert.equal(m.test(null), false);
  assert.equal(m.test(undefined), false);
  assert.equal(m.test(""), false);
});

console.log("CIDR ranges");

check("the real case: a studio uplink that rotated inside its /24", () => {
  // 138.84.139.166 -> .202 happened on prod and needed a manual entry.
  const m = makeIpMatcher(["138.84.139.0/24"]);
  assert.equal(m.test("138.84.139.166"), true);
  assert.equal(m.test("138.84.139.202"), true);
  assert.equal(m.test("138.84.139.0"), true);
  assert.equal(m.test("138.84.139.255"), true);
  assert.equal(m.test("138.84.140.1"), false, "must not leak into the next /24");
  assert.equal(m.test("138.84.138.255"), false);
});

check("boundaries are exact at /17", () => {
  const m = makeIpMatcher(["112.201.0.0/17"]);
  assert.equal(m.test("112.201.0.0"), true);
  assert.equal(m.test("112.201.70.246"), true);
  assert.equal(m.test("112.201.127.255"), true);
  assert.equal(m.test("112.201.128.0"), false, "one past the end of the range");
});

check("/32 is a single address", () => {
  const m = makeIpMatcher(["203.0.113.5/32"]);
  assert.equal(m.test("203.0.113.5"), true);
  assert.equal(m.test("203.0.113.6"), false);
});

check("a sloppy base is masked, not broken", () => {
  // "1.2.3.4/24" means 1.2.3.0/24. Treating it literally would match nothing.
  const m = makeIpMatcher(["1.2.3.4/24"]);
  assert.equal(m.test("1.2.3.9"), true);
  assert.equal(m.test("1.2.4.9"), false);
});

check("mixed exact + range entries both work", () => {
  const m = makeIpMatcher(["103.66.223.116", "138.84.139.0/24"]);
  assert.equal(m.test("103.66.223.116"), true);
  assert.equal(m.test("138.84.139.202"), true);
  assert.equal(m.test("8.8.8.8"), false);
});

console.log("IPv6");

check("matches inside a v6 prefix, including compressed forms", () => {
  const m = makeIpMatcher(["2001:db8::/32"]);
  assert.equal(m.test("2001:db8::1"), true);
  assert.equal(m.test("2001:0db8:0000:0000:0000:0000:0000:0001"), true);
  assert.equal(m.test("2001:db9::1"), false);
});

check("v4 and v6 never cross-match", () => {
  const v6only = makeIpMatcher(["::/0"]);
  assert.equal(v6only.test("1.2.3.4"), false, "a v4 address is not inside ::/0");
  const v4only = makeIpMatcher(["0.0.0.0/0"]);
  assert.equal(v4only.test("2001:db8::1"), false);
});

console.log("malformed input fails CLOSED");

check("a typo'd RANGE is dropped, not treated as a wildcard", () => {
  const m = makeIpMatcher(["not-an-ip/24", "1.2.3.4/99", "1.2.3.4/-1"]);
  assert.equal(m.test("1.2.3.4"), false, "an invalid prefix must not match its base");
  assert.equal(m.test("8.8.8.8"), false);
});

check("a malformed BARE entry is inert rather than dropped", () => {
  // Bare entries stay string-equality — the pre-existing path, untouched, so a
  // gap in this file's parser can never lock out an existing entry. "999.1.1.1"
  // is not a real address, so nothing a client can present will equal it.
  const m = makeIpMatcher(["999.1.1.1", "1.2.3.4"]);
  assert.equal(m.test("1.2.3.4"), true);
  assert.equal(m.test("8.8.8.8"), false);
});

check("a valid entry still works alongside a broken one", () => {
  const m = makeIpMatcher(["garbage/24", "138.84.139.0/24"]);
  assert.equal(m.test("138.84.139.202"), true);
});

check("octets are parsed strictly", () => {
  const m = makeIpMatcher(["1.2.3.4"]);
  // No octal/space/plus leniency — a lenient parse would let a different
  // address be read as an allowlisted one.
  assert.equal(m.test("1.2.3.04"), false);
  assert.equal(m.test(" 1.2.3.4"), false);
  assert.equal(m.test("1.2.3.4 "), false);
});

console.log(`\n${passed} checks passed`);
