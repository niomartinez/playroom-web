import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";

// Hermetic UI coverage: run against a LOCAL Next dev server with this explicit
// test secret; every backend request is intercepted. No account or live data.
const secret = process.env.BET_LOG_E2E_SECRET || "bet-log-local-test-secret";
const row = {
  id: "11111111-1111-1111-1111-111111111111", external_bet_id: "BET-123",
  fight_id: "round-1", external_fight_id: "ROUND-1", player_username: "OC1alice",
  player_display_name: "Alice", player_external_id: "alice", site_code: "OC1",
  site_label: "One", game_name: "Table 1", external_game_id: "BAC-TABLE-01",
  bet_code: "BAC_Banker", team: "Banker", bet_amount: 100, odds: null,
  payoff: 195, status: "settled", created_at: "2026-09-26T16:00:00Z",
};

test.beforeEach(async ({ page, context, baseURL }) => {
  test.skip(!baseURL?.match(/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/), "Local test server only");
  const token = await new SignJWT({ sub: "test", role: "game_provider" })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
  await context.addCookies([{ name: "admin_session", value: token, url: baseURL! }]);
  await page.route("**/api/admin/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/admin/me") return route.fulfill({ json: {
      id: "test", display_name: "Studio", role: "game_provider",
      permissions: { rounds: "read", reports: "read", tables: "read", dashboard: "read" },
    } });
    if (path === "/api/admin/sites") return route.fulfill({ json: { data: { sites: [
      { site_code: "OC1", site_label: "One", registered_players: 5 },
    ] } } });
    if (path === "/api/admin/tables") return route.fulfill({ json: { data: [] } });
    if (path === "/api/admin/bets/export") return route.fulfill({
      contentType: "text/csv", body: "id,external_bet_id\n1,BET-123\n",
      headers: { "Content-Disposition": "attachment; filename=bet-log.csv" },
    });
    if (path === "/api/admin/bets") return route.fulfill({ json: {
      error_code: "0", data: { bets: [row], total: 101, page: 1, page_size: 20 },
    } });
    return route.fulfill({ json: { data: {} } });
  });
});

test("filters, pagination and export use the server query", async ({ page }, testInfo) => {
  await page.goto("/admin/bets");
  await expect(page.getByRole("heading", { name: "Bet log" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bet log", exact: true })).toBeVisible();
  await expect(page.getByText("BET-123", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  const nextPage = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/admin/bets" && new URL(r.url()).searchParams.get("page") === "2");
  await page.getByRole("button", { name: "Page 2", exact: true }).click();
  await nextPage;
  await page.getByLabel("Exact bet ID").filter({ visible: true }).fill("BET-123");
  await page.getByLabel("Player search").filter({ visible: true }).fill("alice");
  await page.getByLabel("Filter by site").filter({ visible: true }).selectOption("OC1");
  await page.getByLabel("From (Manila)").filter({ visible: true }).fill("2026-09-01");
  await page.getByLabel("To (Manila)").filter({ visible: true }).fill("2026-09-27");
  const query = page.waitForRequest((r) => {
    const u = new URL(r.url());
    return u.pathname === "/api/admin/bets" && u.searchParams.get("player") === "alice";
  });
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  const params = new URL((await query).url()).searchParams;
  expect(Object.fromEntries(params)).toMatchObject({ bet_id: "BET-123", player: "alice", site: "OC1", date_from: "2026-09-01", date_to: "2026-09-27", page: "1" });
  const exportRequest = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/admin/bets/export");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const exported = new URL((await exportRequest).url()).searchParams;
  for (const key of ["bet_id", "player", "site", "date_from", "date_to"]) expect(exported.get(key)).toBe(params.get(key));
  expect(exported.has("page")).toBe(false);
  expect((await download).suggestedFilename()).toBe("bet-log.csv");
  await expect(page.getByRole("link", { name: "ROUND-1", exact: true }).first()).toHaveAttribute("href", "/admin/rounds/round-1");
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), fullPage: true });
});

test("mobile layout stays within viewport and export failures are readable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/admin/bets/export?**", (route) => route.fulfill({ status: 413, json: { detail: "Please narrow the date range or filters." } }));
  await page.goto("/admin/bets");
  await expect(page.getByRole("heading", { name: "Bet log" })).toBeVisible();
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please narrow" })).toContainText("Please narrow");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
});


test("clear filters also clears an unsubmitted search", async ({ page }) => {
  await page.goto("/admin/bets");
  const search = page.getByRole("textbox", { name: "Player search" });
  await search.fill("draft-player");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(search).toHaveValue("");
});
