import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";

// Run against a local server with both suspension flags enabled and
// ADMIN_JWT_SECRET=infra-test-only. No real account or credentials are needed.
test.skip(process.env.INFRASTRUCTURE_E2E !== "1", "Requires the isolated suspension fixture");

async function session(email: string, role = "superadmin") {
  return new SignJWT({ sub: "test-user", admin_id: "test-user", email, role })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h")
    .sign(new TextEncoder().encode("infra-test-only"));
}

test("admin and studio routes show the full payment notice", async ({ request }) => {
  for (const path of ["/admin", "/admin/reports", "/admin/login", "/studio", "/studio/guide", "/studio/login"]) {
    const response = await request.get(path);
    expect([200, 503]).toContain(response.status());
    const html = await response.text();
    expect(html).toContain("Resource unavailable");
    expect(html).toContain("Please settle the unpaid invoices");
    expect(html).toContain("contact the developers");
  }
});

test("Wayne, legacy studio cookies and other superadmins cannot bypass suspension", async ({ request }) => {
  for (const [email, role] of [["wayne@playroomgaming.ph", "game_provider"], ["SuperAdmin", "superadmin"], ["Nio", "dealer"]]) {
    const response = await request.get("/api/admin/suspension-test", {
      headers: { Cookie: `admin_session=${await session(email, role)}` },
    });
    expect(response.status()).toBe(503);
    expect((await response.json()).error_code).toBe("infrastructure_unpaid");
  }
  const legacy = await request.get("/api/studio/suspension-test", {
    headers: { Cookie: `studio_session=${await session("legacy", "studio")}` },
  });
  expect(legacy.status()).toBe(503);
  const ticket = await request.post("/api/lobby-ticket", {
    headers: { Cookie: `studio_session=${await session("dealer.table1", "dealer")}` },
    data: { role: "studio", table_id: "table" },
  });
  expect(ticket.status()).toBe(503);
});

test("only named developers are exempt and OCMS is outside the suspension", async ({ request }) => {
  for (const name of ["Nio", "Heins"]) {
    const token = await session(name);
    for (const surface of ["admin", "studio"]) {
      const response = await request.get(`/api/${surface}/suspension-test`, {
        headers: { Cookie: `${surface}_session=${token}` },
      });
      // An absent route returns 404 only after the suspension guard permits it.
      expect(response.status()).toBe(404);
    }
  }
  const ocms = await request.get("/admin-ocms/login");
  expect(ocms.status()).toBe(200);
  expect(await ocms.text()).not.toContain("unpaid infrastructure bill");
  const ocmsApi = await request.get("/api/admin-ocms/me");
  expect(ocmsApi.status()).toBe(401);
});

test("notice fits desktop and mobile", async ({ page }) => {
  for (const [width, height] of [[1280, 800], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/studio");
    await expect(page.getByRole("heading", { name: "Resource unavailable" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Developer sign in" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/playroom-infrastructure-${width}.png` });
  }
});
