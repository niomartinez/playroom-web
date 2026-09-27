import { test, expect } from "@playwright/test";
import { combinedSiteGgr } from "../src/lib/report-ggr";

// These are calculation tests; they do not open a browser or connect to a backend.
const sites = Object.freeze([
  Object.freeze({ site_code: "WIN", ggr: 100000 }),
  Object.freeze({ site_code: "LOS", ggr: -30000 }),
  Object.freeze({ site_code: "IDLE", ggr: 0 }),
  Object.freeze({ site_code: null, ggr: 125.35 }),
]);

test("a losing site does not reduce another site's combined GGR", () => {
  expect(combinedSiteGgr(sites)).toBe(100125.35);
  expect(sites[1].ggr).toBe(-30000);
});

test("all losing sites contribute zero even when the net total is negative", () => {
  expect(combinedSiteGgr([{ site_code: "A", ggr: -900 }, { site_code: "B", ggr: -123.45 }])).toBe(0);
});

test("fractional peso totals retain their cents", () => {
  expect(combinedSiteGgr([{ site_code: "A", ggr: 0.1 }, { site_code: "B", ggr: 0.2 }])).toBe(0.3);
});

for (const [site, expected] of [["WIN", 100000], ["LOS", 0], ["IDLE", 0], ["unassigned", 125.35], ["MISSING", 0]] as const) {
  test(`the ${site} filter includes only that site's contribution`, () => {
    expect(combinedSiteGgr(sites, site)).toBe(expected);
  });
}

test("an empty period is zero, while unavailable site data is unknown", () => {
  expect(combinedSiteGgr([])).toBe(0);
  expect(combinedSiteGgr(undefined)).toBeNull();
});
