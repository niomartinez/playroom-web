import { test, expect, type Page } from "@playwright/test";

/**
 * Player UI — BOD batch smoke, driven against `/play/demo`.
 *
 * Covers the demo-testable items from `docs/PLAYER_UI_TESTING.md`:
 *   #1  countdown ring during betting        #9  Sound & Video
 *   #3  balance renders exact cents          #10 Game History (empty state)
 *   #8  How to Play                          #11 Payouts & Limits
 *
 * The demo route has no client-side round loop — `roundStatus` only leaves
 * "waiting" when a RoundStarted frame arrives over the lobby WebSocket
 * (`use-lobby-ws.ts`). Rather than depend on a live dealer, we intercept the
 * socket and inject the frame ourselves, which also keeps the countdown value
 * deterministic. The two upstream fetches the page hard-depends on
 * (`/api/emulator/tables`, `/api/tables/{id}/state`) are stubbed for the same
 * reason: unstubbed, a staging table with no TEST- entry renders a bare error
 * screen and PlayerLayout never mounts.
 */

const TABLE_ID = "TEST-DEMO-1";
const COUNTDOWN = 15;

/** Stub the network the demo route can't boot without, and take over the WS. */
async function stubDemo(page: Page) {
  await page.route("**/api/emulator/tables", (route) =>
    route.fulfill({
      json: [{ id: TABLE_ID, name: TABLE_ID, external_game_id: TABLE_ID }],
    }),
  );

  await page.route("**/api/tables/*/state", (route) =>
    route.fulfill({
      json: {
        error_code: "0",
        message: "ok",
        data: {
          table: {
            id: TABLE_ID,
            external_game_id: TABLE_ID,
            min_bet: 10,
            max_bet: 10000,
            webrtc_url: null,
            hls_url: null,
            video_delay_ms: 0,
          },
        },
      },
    }),
  );

  await page.route("**/api/lobby-ticket", (route) =>
    route.fulfill({ json: { ticket: "e2e-stub-ticket" } }),
  );

  // Mock the lobby socket entirely (no upstream connect). Holding the route
  // handle lets each test push frames at the moment it needs them.
  const frames: { send: (payload: unknown) => void }[] = [];
  await page.routeWebSocket(/\/ws\/lobby/, (ws) => {
    frames.push({ send: (payload) => ws.send(JSON.stringify(payload)) });
  });

  return {
    /** Open the betting window, as the studio would. */
    async startRound(countdown = COUNTDOWN) {
      await expect
        .poll(() => frames.length, { message: "lobby WS never connected" })
        .toBeGreaterThan(0);
      frames[frames.length - 1].send({
        type: "RoundStarted",
        data: {
          roundId: "e2e-round-1",
          round_number: 1,
          countdown,
          tableId: TABLE_ID,
        },
      });
    },
  };
}

/** The ☰ trigger — `aria-label="Menu"`; the open panel's title reuses the text. */
const menuButton = (page: Page) =>
  page.getByRole("button", { name: "Menu", exact: true });

test.describe("player demo — BOD batch", () => {
  test("#3 balance renders exact cents, never rounded", async ({ page }) => {
    await stubDemo(page);
    await page.goto("/play/demo");

    // Demo seeds 10000; formatBalance pins min/maxFractionDigits to 2.
    await expect(page.getByText("₱10,000.00")).toBeVisible();
  });

  test("#1 countdown ring appears during betting and matches the header pill", async ({
    page,
  }) => {
    const demo = await stubDemo(page);
    await page.goto("/play/demo");
    await expect(page.getByText("₱10,000.00")).toBeVisible();

    // The ring is aria-hidden and never unmounts — it is opacity-gated on
    // roundStatus === "betting_open". Assert the opacity flip, not presence.
    const ring = page
      .locator('div[aria-hidden]:has(> div > svg[viewBox="0 0 100 100"])')
      .first();
    const ringOpacity = () =>
      ring.evaluate((el) => Number(getComputedStyle(el).opacity));

    expect(await ringOpacity()).toBe(0);

    await demo.startRound();

    // Betting is open: ring fades in and the header pill counts down.
    await expect.poll(ringOpacity).toBe(1);
    await expect(page.getByText(/PLACE BETS \(\d+s\)/)).toBeVisible();
  });

  test("#8/#9/#10/#11 ☰ menu opens and each section renders", async ({
    page,
  }) => {
    await stubDemo(page);
    await page.goto("/play/demo");
    await expect(page.getByText("₱10,000.00")).toBeVisible();

    await menuButton(page).click();
    const menu = page.getByRole("dialog");
    await expect(menu).toBeVisible();

    // All four sections are offered.
    for (const section of [
      "How to Play",
      "Payouts & Limits",
      "Game History",
      "Sound & Video",
    ]) {
      await expect(menu.getByRole("button", { name: section })).toBeVisible();
    }

    const back = () => menu.getByRole("button", { name: "Back" }).click();

    // #8 How to Play — rules content.
    await menu.getByRole("button", { name: "How to Play" }).click();
    await expect(menu.getByText("Card values")).toBeVisible();
    await expect(menu.getByText("How a round works")).toBeVisible();
    await back();

    // #11 Payouts & Limits — payout table + live min/max from table state.
    await menu.getByRole("button", { name: "Payouts & Limits" }).click();
    await expect(menu.getByText("Table limits")).toBeVisible();
    await expect(menu.getByText("0.95 : 1")).toBeVisible(); // Banker, 5% commission
    // Limits come from the stubbed state — must render, not fall back to "—".
    // Stakes use formatMoney (whole numbers) — only the balance carries cents.
    await expect(menu.getByText("₱10", { exact: true })).toBeVisible(); // min
    await expect(menu.getByText("₱10,000", { exact: true })).toBeVisible(); // max
    await back();

    // #10 Game History — demo short-circuits to the empty state, no fetch.
    await menu.getByRole("button", { name: "Game History" }).click();
    await expect(menu.getByText("No bets yet.")).toBeVisible();
    await back();

    // #9 Sound & Video — mute toggle, volume, reload.
    await menu.getByRole("button", { name: "Sound & Video" }).click();
    await expect(menu.getByRole("slider", { name: "Volume" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "Reload stream" })).toBeVisible();
  });
});
