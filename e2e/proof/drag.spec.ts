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

async function openRound(page: Page, send: (p: unknown) => void) {
  send({ type: "RoundStarted", data: { roundId: "r1", round_number: 1, countdown: 30, tableId: TABLE_ID } });
  await page.waitForTimeout(400);
}

/** Count visible chip-marker imgs sitting on a pad (one per unique denom). */
function padChips(page: Page, code: string) {
  return page.locator(`[data-bet-code="${code}"] img[src*="/mobile-assets/chip-"]`);
}

async function centerOf(page: Page, code: string) {
  const box = await page.locator(`[data-bet-code="${code}"]`).boundingBox();
  if (!box) throw new Error(`no box for ${code}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.use({ viewport: { width: 1400, height: 900 } });

test("drag-to-move main bet: place, ghost, move onto opposing pad, side bets untouched", async ({ page }) => {
  const { send } = await boot(page);
  await openRound(page, send);

  // ── Item 1: select 1000 chip, place on PLAYER, confirm chip-1000.png shows.
  await page.locator('[data-balance-chips] [data-chip-denom="1000"]').first().click();
  await page.locator('[data-bet-code="BAC_Player"]').click();
  await page.waitForTimeout(700);
  await expect(
    page.locator('[data-bet-code="BAC_Player"] img[src*="chip-1000.png"]'),
  ).toBeVisible();
  const playerBefore = await padChips(page, "BAC_Player").count();
  const bankerBefore = await padChips(page, "BAC_Banker").count();

  // ── Item 3 (mid-drag) + Item 2 (the actual move): drag PLAYER -> BANKER.
  const p = await centerOf(page, "BAC_Player");
  const b = await centerOf(page, "BAC_Banker");
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  // Move past the 8px activation threshold to spawn the drag ghost.
  await page.mouse.move(p.x + 20, p.y, { steps: 4 });
  await page.waitForTimeout(180);

  // Ghost must be the REAL chip image, not an arrow glyph: fixed overlay
  // (zIndex 300) containing chip-1000.png and ZERO <svg>.
  const ghost = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll("div[aria-hidden]")) as HTMLElement[];
    const g = divs.find((d) => {
      const s = getComputedStyle(d);
      return s.position === "fixed" && s.zIndex === "300";
    });
    if (!g) return null;
    return {
      chip1000Imgs: g.querySelectorAll('img[src*="chip-1000.png"]').length,
      anyChipImgs: g.querySelectorAll('img[src*="/mobile-assets/chip-"]').length,
      svgs: g.querySelectorAll("svg").length,
    };
  });
  await page.screenshot({ path: `${SHOT_DIR}/drag-ghost-mid-drag.png` });
  expect(ghost, "drag ghost overlay must exist").not.toBeNull();
  expect(ghost!.chip1000Imgs).toBeGreaterThanOrEqual(1);
  expect(ghost!.anyChipImgs).toBeGreaterThanOrEqual(1);
  expect(ghost!.svgs).toBe(0);

  // Complete the drop onto BANKER (the opposing-disabled pad — must still work).
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  // The move happened: PLAYER emptied, BANKER now carries the chip.
  const playerAfter = await padChips(page, "BAC_Player").count();
  const bankerAfter = await padChips(page, "BAC_Banker").count();
  expect(playerAfter).toBe(0);
  await expect(
    page.locator('[data-bet-code="BAC_Banker"] img[src*="chip-1000.png"]'),
  ).toBeVisible();
  expect(bankerAfter).toBeGreaterThanOrEqual(1);

  console.log(
    `ITEM1-2 counts  PLAYER before=${playerBefore} after=${playerAfter} | BANKER before=${bankerBefore} after=${bankerAfter}`,
  );
  console.log(`ITEM3 ghost ${JSON.stringify(ghost)}`);
});

test("side bet is untouched when a main bet is dragged", async ({ page }) => {
  const { send } = await boot(page);
  await openRound(page, send);

  await page.locator('[data-balance-chips] [data-chip-denom="1000"]').first().click();
  // Place a PLAYER_PAIR side bet and a PLAYER main bet.
  await page.locator('[data-bet-code="BAC_PlayerPair"]').click();
  await page.locator('[data-bet-code="BAC_Player"]').click();
  await page.waitForTimeout(500);

  await expect(
    page.locator('[data-bet-code="BAC_PlayerPair"] img[src*="chip-1000.png"]'),
  ).toBeVisible();
  const pairBefore = await padChips(page, "BAC_PlayerPair").count();
  const playerBefore = await padChips(page, "BAC_Player").count();
  const tieBefore = await padChips(page, "BAC_Tie").count();

  // Drag PLAYER -> TIE.
  const p = await centerOf(page, "BAC_Player");
  const t = await centerOf(page, "BAC_Tie");
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 20, p.y, { steps: 4 });
  await page.mouse.move(t.x, t.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  const pairAfter = await padChips(page, "BAC_PlayerPair").count();
  const playerAfter = await padChips(page, "BAC_Player").count();
  const tieAfter = await padChips(page, "BAC_Tie").count();

  // PLAYER_PAIR untouched; the main bet relocated PLAYER -> TIE.
  await expect(
    page.locator('[data-bet-code="BAC_PlayerPair"] img[src*="chip-1000.png"]'),
  ).toBeVisible();
  expect(pairAfter).toBe(pairBefore);
  expect(playerAfter).toBe(0);
  await expect(
    page.locator('[data-bet-code="BAC_Tie"] img[src*="chip-1000.png"]'),
  ).toBeVisible();

  console.log(
    `ITEM5 counts  PLAYER_PAIR before=${pairBefore} after=${pairAfter} | PLAYER before=${playerBefore} after=${playerAfter} | TIE before=${tieBefore} after=${tieAfter}`,
  );
});

test("over-max stack refuses to move and shows Max bet toast", async ({ page }) => {
  const { send } = await boot(page, { maxEff: 500 });
  await openRound(page, send);

  // Stack three 250 chips on PLAYER -> pad total 750 > effective max 500.
  await page.locator('[data-balance-chips] [data-chip-denom="250"]').first().click();
  const player = page.locator('[data-bet-code="BAC_Player"]');
  await player.click();
  await player.click();
  await player.click();
  await page.waitForTimeout(400);
  await expect(
    page.locator('[data-bet-code="BAC_Player"] img[src*="chip-250.png"]'),
  ).toBeVisible();
  const playerBefore = await padChips(page, "BAC_Player").count();
  const bankerBefore = await padChips(page, "BAC_Banker").count();

  // Drag PLAYER -> BANKER; the consolidated 750 stack exceeds the 500 max.
  const p = await centerOf(page, "BAC_Player");
  const b = await centerOf(page, "BAC_Banker");
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 20, p.y, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();

  // A red "Max bet ..." error toast appears.
  const toast = page.getByText(/Max bet/i);
  await expect(toast).toBeVisible({ timeout: 3000 });
  const toastText = (await toast.textContent()) ?? "";
  const toastColor = await toast.evaluate((el) => getComputedStyle(el).color);
  await page.screenshot({ path: `${SHOT_DIR}/drag-maxbet-toast.png` });

  await page.waitForTimeout(500);
  // The bet did NOT move: PLAYER keeps its chip, BANKER stays empty.
  const playerAfter = await padChips(page, "BAC_Player").count();
  const bankerAfter = await padChips(page, "BAC_Banker").count();
  await expect(
    page.locator('[data-bet-code="BAC_Player"] img[src*="chip-250.png"]'),
  ).toBeVisible();
  expect(bankerAfter).toBe(0);

  console.log(
    `ITEM4 toast="${toastText.trim()}" color=${toastColor} | PLAYER before=${playerBefore} after=${playerAfter} | BANKER before=${bankerBefore} after=${bankerAfter}`,
  );
});
