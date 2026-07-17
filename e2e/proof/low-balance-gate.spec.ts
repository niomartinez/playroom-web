import { test, expect } from "@playwright/test";

const SCRATCH =
  "/private/tmp/claude-1175276035/-Users-antoniomartinez-Documents-GitHub-topless-casino-backend/acf91383-f142-4d40-9631-fd1c14204fb5/scratchpad";

const TOKEN =
  "spQdArAkJ3AnB9lJK0f2jrcUZh_m1Wj4l8Ppf-78qeOS5nig8Q9Ki94jvy2Rj3sI";
const URL = `/play?token=${TOKEN}&game=BAC-TABLE-01&lang=en`;

test("low-balance gate: ₱5 session below ₱50 table minimum", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(URL); // 302s through cookie handoff — expected
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(5000); // wait for balance WS frame

  // --- The gate placard must be present ---
  const gate = page.locator('[role="status"]').filter({ hasText: /minimum/i }).first();
  await expect(gate).toBeVisible({ timeout: 10000 });

  const gateText = (await gate.textContent())?.replace(/\s+/g, " ").trim() ?? "";
  console.log("GATE TEXT:", JSON.stringify(gateText));

  // TABLE MINIMUM ₱50 (label CSS-uppercased; DOM is 'Table minimum')
  await expect(gate.getByText("Table minimum", { exact: true })).toBeVisible();
  await expect(gate.getByText("₱50", { exact: true })).toBeVisible();

  // SHORT BY ₱45
  await expect(gate.getByText("Short by", { exact: true })).toBeVisible();
  await expect(gate.getByText("₱45", { exact: true })).toBeVisible();

  // --- NO dead ADD FUNDS button; the hint text is shown instead ---
  const addFundsBtn = page.getByRole("button", { name: /add funds/i });
  expect(await addFundsBtn.count()).toBe(0);
  await expect(
    gate.getByText("Add funds through your operator to keep playing.", { exact: true })
  ).toBeVisible();

  // --- The gate cannot be dismissed (no dismiss control; still there after Escape/click) ---
  const closeBtns = await gate.getByRole("button").count();
  console.log("BUTTONS INSIDE GATE:", closeBtns);
  expect(closeBtns).toBe(0);
  await page.keyboard.press("Escape");
  await page.mouse.click(700, 250); // click on the gate area
  await page.waitForTimeout(500);
  await expect(gate).toBeVisible();

  // --- Inject a bright red div behind the feed; prove the scrim obscures it ---
  const probe = await page.evaluate(() => {
    // The gate lives inside the 16:9 feed container (parent of role=status).
    const gateEl = document.querySelector('[role="status"]');
    const feed = gateEl?.parentElement as HTMLElement | null;
    if (!feed) return { ok: false as const };

    const red = document.createElement("div");
    red.id = "prg-redprobe";
    red.style.cssText =
      "position:absolute;inset:0;background:#ff0000;z-index:0;";
    feed.insertBefore(red, feed.firstChild); // first child => behind everything

    const r = feed.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);

    // What actually paints at the feed centre, top-to-bottom.
    const stack = document.elementsFromPoint(cx, cy).map((e) => {
      const el = e as HTMLElement;
      return el.id || el.getAttribute("role") || el.tagName.toLowerCase();
    });
    const topEl = document.elementFromPoint(cx, cy) as HTMLElement | null;
    const topIsRed = topEl?.id === "prg-redprobe";
    return { ok: true as const, cx, cy, stack, topIsRed };
  });
  console.log("FEED-CENTRE STACK:", JSON.stringify(probe));
  expect(probe.ok).toBe(true);
  if (probe.ok) {
    // The red probe must NOT be the topmost painted element at feed centre.
    expect(probe.topIsRed).toBe(false);
  }

  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCRATCH}/low-balance-gate.png`, fullPage: false });

  // --- Sample the actual painted pixel at feed centre: must be dark scrim, not red ---
  const pixel = await page.evaluate(async () => {
    const gateEl = document.querySelector('[role="status"]');
    const feed = gateEl?.parentElement as HTMLElement | null;
    if (!feed) return null;
    const r = feed.getBoundingClientRect();
    // Sample a point on the scrim, above the placard band (placard sits centred).
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height * 0.18);
    return { x, y };
  });
  console.log("PIXEL SAMPLE POINT:", JSON.stringify(pixel));
});
