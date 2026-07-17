import { test, expect, type Page } from "@playwright/test";

const TABLE_ID = "TEST-DEMO-1";

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

async function openRound(send: (p: unknown) => void, page: Page, roundId = "r1") {
  send({ type: "RoundStarted", data: { roundId, round_number: 1, countdown: 30, tableId: TABLE_ID } });
  await page.waitForTimeout(400);
}

// #3.1 — Balance renders to the exact cent (2 decimals) at boot.
test("balance renders to exact cent at boot", async ({ page }) => {
  await boot(page);
  // The balance readout carries 2 decimal places.
  await expect(page.getByText("₱10,000.00")).toBeVisible();
  // Prove it's NOT rendered as a decimal-less "₱10,000".
  const exact = await page.getByText("₱10,000.00").first().textContent();
  expect(exact).toContain("₱10,000.00");
});

// #3.2 — Over-max refused bet must NOT crawl the balance (no debit, no down-then-up).
test("over-max refused bet never crawls the balance", async ({ page }) => {
  const { send } = await boot(page, { maxEff: 500 });
  await openRound(send, page);

  // Select the 1000 chip (over the 500 effective max) then bet PLAYER.
  await page.locator("[data-balance-chips] [data-chip-denom='1000']").first().click();
  await page.locator("[data-bet-code='BAC_Player']").first().click();

  // Sample the balance text 8x across ~1.2s. It must stay EXACTLY ₱10,000.00.
  const samples: string[] = [];
  for (let i = 0; i < 8; i++) {
    const txt = await page.getByText(/₱[\d,]+\.\d{2}/).first().textContent();
    samples.push((txt ?? "").trim());
    await page.waitForTimeout(150);
  }
  const unique = Array.from(new Set(samples));
  console.log("BALANCE SAMPLES (over-max):", JSON.stringify(unique));
  expect(unique).toEqual(["₱10,000.00"]);

  // A "Max bet" toast must have surfaced.
  const toast = page.getByText(/Max bet/i).first();
  await expect(toast).toBeVisible();
  const toastText = await toast.textContent();
  console.log("MAX-BET TOAST:", toastText);
  expect(toastText).toMatch(/Max bet/i);
});

// #3.3 — Exact-cent win: a 50 BANKER bet pays 50 * 1.95 = 97.50 in demo.
// Both the win-flash line and the settled balance must render 2 decimals,
// never rounded to a whole peso.
test("fractional demo win renders to the exact cent", async ({ page }) => {
  const { send } = await boot(page);
  await openRound(send, page);

  // 50 chip on BANKER.
  await page.locator("[data-balance-chips] [data-chip-denom='50']").first().click();
  await page.locator("[data-bet-code='BAC_Banker']").first().click();
  await page.waitForTimeout(500); // let the optimistic debit settle (10000 -> 9950)

  // Drive demo settlement: Banker wins.
  send({
    type: "RoundResult",
    data: {
      roundId: "r1",
      outcome: "Banker",
      player: { score: 6, cards: ["9H", "7D"] },
      banker: { score: 7, cards: ["KS", "7C"] },
    },
  });

  // Win flash appears with the fractional payoff line.
  const flashAmount = page.locator(".prg-win-flash__line .amount").first();
  await expect(flashAmount).toBeVisible({ timeout: 4000 });
  const flashText = (await flashAmount.textContent())?.trim() ?? "";
  console.log("WIN-FLASH LINE:", flashText);

  // The title too.
  const title = page.locator(".prg-win-flash__title").first();
  const titleText = (await title.textContent())?.trim() ?? "";
  console.log("WIN-FLASH TITLE:", titleText);

  await page.screenshot({ path: "e2e/proof/money-win-flash.png" });

  // The payoff must show 2 decimals (₱97.50), never a rounded whole peso.
  expect(flashText).toContain("97.50");
  expect(flashText).not.toMatch(/₱98(?!\.)/); // not rounded up to 98
  expect(flashText).not.toMatch(/₱97(?!\.)/); // not truncated to 97 (no decimals)

  // Settled balance: 10000 - 50 + 97.50 = 10047.50, shown to the cent.
  await expect(page.getByText("₱10,047.50")).toBeVisible({ timeout: 4000 });
  const bal = await page.getByText("₱10,047.50").first().textContent();
  console.log("SETTLED BALANCE:", bal);
  expect(bal).toContain("₱10,047.50");
});
