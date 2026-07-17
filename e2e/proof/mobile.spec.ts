import { test, expect, type Page } from "@playwright/test";

/**
 * Proof item #13 — mobile-first layout.
 *
 * Real phone viewport (iPhone 12/13 logical size, 390×844). We boot the demo
 * route, open a betting round, and assert:
 *   1. No horizontal scroll  (documentElement.scrollWidth <= innerWidth + 1)
 *   2. Every [data-bet-code] pad is within the viewport width (no clipping)
 *   3. The countdown ring overlay clears the bet pads (ring bottom is above
 *      the first pad's top — no overlap).
 *
 * The low-balance gate placard is NOT reachable here: demo mode is exempt
 * (the gate checks token !== "demo"), so we note it and skip.
 */

const TABLE_ID = "TEST-DEMO-1";

async function boot(page: Page, opts: { maxEff?: number; minEff?: number } = {}) {
  const maxEff = opts.maxEff ?? 10000,
    minEff = opts.minEff ?? 50;
  await page.route("**/api/emulator/tables", (r) =>
    r.fulfill({ json: [{ id: TABLE_ID, name: TABLE_ID, external_game_id: TABLE_ID }] }),
  );
  await page.route("**/api/tables/*/state", (r) =>
    r.fulfill({
      json: {
        error_code: "0",
        message: "ok",
        data: {
          table: {
            id: TABLE_ID,
            external_game_id: TABLE_ID,
            min_bet: 10,
            max_bet: 10000,
            min_bet_effective: minEff,
            max_bet_effective: maxEff,
            webrtc_url: null,
            hls_url: null,
            video_delay_ms: 0,
          },
        },
      },
    }),
  );
  await page.route("**/api/lobby-ticket", (r) => r.fulfill({ json: { ticket: "t" } }));
  const frames: { send: (p: unknown) => void }[] = [];
  await page.routeWebSocket(/\/ws\/lobby/, (ws) => {
    frames.push({ send: (p) => ws.send(JSON.stringify(p)) });
  });
  await page.goto("/play/demo");
  await expect(page.getByText("₱10,000.00")).toBeVisible();
  await expect.poll(() => frames.length).toBeGreaterThan(0);
  const send = (payload: unknown) => frames[frames.length - 1].send(payload);
  return { send };
}

test("item #13 — mobile-first layout at 390×844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const { send } = await boot(page);
  send({
    type: "RoundStarted",
    data: { roundId: "r1", round_number: 1, countdown: 30, tableId: TABLE_ID },
  });
  await page.waitForTimeout(600);

  const innerWidth = await page.evaluate(() => window.innerWidth);

  // ---- 1. No horizontal scroll -------------------------------------------
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth, `scrollWidth ${scrollWidth} vs innerWidth ${innerWidth}`).toBeLessThanOrEqual(
    innerWidth + 1,
  );

  // ---- 2. Bet pads within viewport width ---------------------------------
  const pads = page.locator("[data-bet-code]");
  const padCount = await pads.count();
  expect(padCount).toBeGreaterThan(0);

  const padBoxes: { code: string; left: number; right: number; top: number; bottom: number }[] =
    [];
  for (let i = 0; i < padCount; i++) {
    const el = pads.nth(i);
    const box = await el.boundingBox();
    const code = (await el.getAttribute("data-bet-code")) ?? `#${i}`;
    if (!box) continue;
    padBoxes.push({
      code,
      left: box.x,
      right: box.x + box.width,
      top: box.y,
      bottom: box.y + box.height,
    });
    // no clipping: pad fully inside [0, innerWidth]
    expect(box.x, `${code} left`).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, `${code} right`).toBeLessThanOrEqual(innerWidth + 1);
  }

  // ---- 3. Countdown ring clears the bet pads -----------------------------
  const ring = page.locator(
    'div[aria-hidden]:has(> div > svg[viewBox="0 0 100 100"])',
  );
  await expect(ring.first()).toBeVisible();
  const ringBox = await ring.first().boundingBox();
  expect(ringBox).not.toBeNull();

  // first pad = smallest top
  const firstPadTop = Math.min(...padBoxes.map((p) => p.top));
  const ringBottom = ringBox!.y + ringBox!.height;

  // Log observed geometry for the report.
  console.log(
    JSON.stringify(
      {
        innerWidth,
        scrollWidth,
        ring: { top: ringBox!.y, bottom: ringBottom },
        firstPadTop,
        pads: padBoxes.map((p) => ({
          code: p.code,
          left: Math.round(p.left),
          right: Math.round(p.right),
          top: Math.round(p.top),
        })),
      },
      null,
      2,
    ),
  );

  expect(
    ringBottom,
    `ring bottom ${ringBottom} must be above first pad top ${firstPadTop}`,
  ).toBeLessThanOrEqual(firstPadTop + 1);

  await page.screenshot({
    path: "e2e/proof/mobile-view.png",
    fullPage: false,
  });
});
