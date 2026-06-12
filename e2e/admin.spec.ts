import { test, expect, Page } from "@playwright/test";

const USER = process.env.ADMIN_E2E_USER || "";
const PASS = process.env.ADMIN_E2E_PASS || "";

test.skip(!USER || !PASS, "ADMIN_E2E_USER / ADMIN_E2E_PASS not set");

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/username or email/i).fill(USER);
  await page.getByLabel(/^password$/i).fill(PASS);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/admin");
}

test("rejects wrong password with a readable message (no blank page)", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel(/username or email/i).fill(USER);
  await page.getByLabel(/^password$/i).fill("definitely-wrong-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("logs in with a username (no @) and sees the dashboard", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/admin$/);
});

const PAGES = [
  "/admin", "/admin/operators", "/admin/tables", "/admin/rounds",
  "/admin/players", "/admin/reports", "/admin/monitoring", "/admin/audit",
  "/admin/users", "/admin/settings",
];

test("smoke: every admin page renders without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("favicon")) {
      errors.push(m.text());
    }
  });
  await login(page);
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
  }
  expect(errors, errors.join("\n")).toEqual([]);
});

test("unauthenticated /admin redirects to login", async ({ page }) => {
  await page.goto("/admin/reports");
  await page.waitForURL("**/admin/login");
});
