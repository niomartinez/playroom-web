import { test, expect, type Page } from "@playwright/test";

const TABLE_ID = "TEST-DEMO-1";
const SHOT_DIR =
  "test-results/proof";

async function boot(page: Page, opts: { maxEff?: number; minEff?: number } = {}) {
  const maxEff = opts.maxEff ?? 10000,
    minEff = opts.minEff ?? 50;
  await page.route("**/api/emulator/tables", (r) =>
    r.fulfill({ json: [{ id: TABLE_ID, name: TABLE_ID, external_game_id: TABLE_ID }] }));
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
    }));
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

// The big centered feed overlay — outer aria-hidden div carries the opacity,
// its text content is just the seconds number (svg carries no text).
function ringLocator(page: Page) {
  return page.locator('div[aria-hidden]:has(> div > svg[viewBox="0 0 100 100"])');
}

async function ringOpacity(page: Page): Promise<number> {
  return ringLocator(page).evaluate((el) => parseFloat(getComputedStyle(el as HTMLElement).opacity));
}

test("countdown ring + header pill agree; banner shows phase only", async ({ page }) => {
  const { send } = await boot(page);

  // Open a real betting round with a 30s window.
  send({
    type: "RoundStarted",
    data: { roundId: "r1", round_number: 1, countdown: 30, tableId: TABLE_ID },
  });
  await page.waitForTimeout(600);

  // --- Part 1: ring fades in, header pill matches PLACE BETS (Ns) ---
  const ring = ringLocator(page);
  await expect(ring).toHaveCount(1);
  await expect.poll(() => ringOpacity(page)).toBe(1);

  const pill = page.getByText(/PLACE BETS \(\d+s\)/);
  await expect(pill).toBeVisible();

  const pillText = (await pill.innerText()).trim();
  const ringText = (await ring.innerText()).trim();
  const pillSeconds = Number(pillText.match(/\((\d+)s\)/)![1]);
  const ringNumber = Number(ringText.match(/\d+/)![0]);
  console.log(`PART1 pill="${pillText}" (${pillSeconds}s) ring="${ringText}" (${ringNumber})`);

  expect(Math.abs(pillSeconds - ringNumber)).toBeLessThanOrEqual(1);
  // sanity: values are actually a live ~30s countdown, not 0/15 default
  expect(ringNumber).toBeGreaterThan(20);
  expect(ringNumber).toBeLessThanOrEqual(30);

  // --- Part 3: no stream → DealVisualizer banner is phase-only ---
  const exactPlaceBets = page.getByText("PLACE BETS", { exact: true });
  const exactCount = await exactPlaceBets.count();
  const bodyText = await page.evaluate(() => document.body.innerText);
  const secondsInBannerFmt = bodyText.match(/PLACE BETS\s+\d+s/g) ?? [];
  console.log(
    `PART3 exact "PLACE BETS" elements=${exactCount}; ` +
      `"/PLACE BETS\\s+\\d+s/" matches=${JSON.stringify(secondsInBannerFmt)}`,
  );

  expect(exactCount).toBe(1); // the DealVisualizer banner, phase only
  expect(secondsInBannerFmt.length).toBe(0); // ring owns the seconds, banner does not

  await page.screenshot({ path: `${SHOT_DIR}/countdown-betting.png`, fullPage: false });
});

test("phantom-timer regression: lobby_state betting_open with no round does NOT start a clock", async ({
  page,
}) => {
  const { send } = await boot(page);

  // A lobby_state snapshot that says our table is betting_open but carries
  // NO round (no roundId / countdown), sent BEFORE any RoundStarted.
  send({
    type: "lobby_state",
    data: { tables: { [TABLE_ID]: { round_status: "betting_open" } } },
  });
  await page.waitForTimeout(1500);

  // Ring must stay invisible (opacity 0) — no fabricated countdown.
  const op = await ringOpacity(page);
  console.log(`PHANTOM ring opacity after 1500ms = ${op}`);
  expect(op).toBe(0);

  // And there must be NO "PLACE BETS (Ns)" pill anywhere.
  const bodyText = await page.evaluate(() => document.body.innerText);
  const pillMatches = bodyText.match(/PLACE BETS \(\d+s\)/g) ?? [];
  console.log(`PHANTOM "/PLACE BETS \\(\\d+s\\)/" matches=${JSON.stringify(pillMatches)}`);
  expect(pillMatches.length).toBe(0);
  await expect(page.getByText(/PLACE BETS \(\d+s\)/)).toHaveCount(0);
});
