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
            // Raw config vs what a bet is actually validated against. The UI
            // must advertise the effective floor: a ₱10 bet on this table is
            // rejected by the ₱50 per-code minimum.
            min_bet: 10,
            max_bet: 10000,
            min_bet_effective: 50,
            max_bet_effective: 10000,
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

  async function waitForSocket() {
    await expect
      .poll(() => frames.length, { message: "lobby WS never connected" })
      .toBeGreaterThan(0);
    return frames[frames.length - 1];
  }

  return {
    /** Open the betting window, as the studio would. */
    async startRound(countdown = COUNTDOWN) {
      (await waitForSocket()).send({
        type: "RoundStarted",
        data: {
          roundId: "e2e-round-1",
          round_number: 1,
          countdown,
          tableId: TABLE_ID,
        },
      });
    },

    /**
     * The snapshot the backend pushes on every WS connect
     * (`app/api/ws_lobby.py`). Shape matters: it carries `round_status` per
     * table and nothing else — no round id, no countdown, no end time.
     */
    async sendLobbyState(roundStatus: string) {
      (await waitForSocket()).send({
        type: "lobby_state",
        data: {
          tables: {
            [TABLE_ID]: {
              tableId: TABLE_ID,
              name: TABLE_ID,
              dealer: null,
              history: [],
              round_status: roundStatus,
            },
          },
          history: [],
          round_status: roundStatus,
        },
      });
    },
  };
}

/** The big translucent ring over the feed (aria-hidden, opacity-gated). */
const countdownRing = (page: Page) =>
  page.locator('div[aria-hidden]:has(> div > svg[viewBox="0 0 100 100"])').first();

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

  test("#1 betting window counts down, and the header pill agrees with the feed", async ({
    page,
  }) => {
    const demo = await stubDemo(page);
    await page.goto("/play/demo");
    await expect(page.getByText("₱10,000.00")).toBeVisible();

    // Nothing counts before a round opens.
    await expect(page.getByText(/PLACE BETS/)).toHaveCount(0);

    await demo.startRound();

    // Demo has no stream, so DealVisualizer owns the feed and carries the
    // seconds; the header pill runs off the same useCountdown clock.
    await expect(page.getByText(/PLACE BETS\s+\d+s/)).toBeVisible();
    await expect(page.getByText(/PLACE BETS \(\d+s\)/)).toBeVisible();

    // Both read the same shared clock, so they must never disagree.
    const feedSecs = async () =>
      Number(/(\d+)s/.exec((await page.getByText(/PLACE BETS\s+\d+s/).textContent()) ?? "")![1]);
    const pillSecs = async () =>
      Number(/\((\d+)s\)/.exec((await page.getByText(/PLACE BETS \(\d+s\)/).textContent()) ?? "")![1]);
    expect(Math.abs((await feedSecs()) - (await pillSecs()))).toBeLessThanOrEqual(1);
  });

  test("#1 a lobby_state snapshot with no round must not start a phantom countdown", async ({
    page,
  }) => {
    const demo = await stubDemo(page);
    await page.goto("/play/demo");
    await expect(page.getByText("₱10,000.00")).toBeVisible();

    // The snapshot says betting is open but names no round and carries no
    // timing. use-countdown used to trust the status alone and invent a 15s
    // window from Date.now(): it counted to 0 and pinned there forever,
    // because the real BettingClosed for that round had already fired before
    // this client connected.
    await demo.sendLobbyState("betting_open");

    // Long enough for the old phantom timer to have started and expired.
    await page.waitForTimeout(1500);

    // The phase is honest — betting IS open — but no invented seconds, in
    // the header pill or the feed.
    await expect(page.getByText(/PLACE BETS\s*\(?\s*\d+\s*s/)).toHaveCount(0);

    // A real round still starts the clock normally.
    await demo.startRound();
    await expect(page.getByText(/PLACE BETS \(\d+s\)/)).toBeVisible();
  });

  test("#1 exactly one countdown renders over the no-stream fallback", async ({
    page,
  }) => {
    const demo = await stubDemo(page);
    await page.goto("/play/demo");
    await expect(page.getByText("₱10,000.00")).toBeVisible();

    await demo.startRound();
    await expect(page.getByText(/PLACE BETS\s+\d+s/)).toBeVisible();

    // RoundCountdown is the countdown *for live video*. With no stream,
    // DealVisualizer is the fallback and owns the centre of the feed — the
    // ring used to render on top of it, stamping its huge number straight
    // through the banner. Over a fallback there must be exactly one: the
    // banner. (The ring over real video isn't reachable here — the demo
    // route has no stream to put it over.)
    await expect(countdownRing(page)).toHaveCount(0);
    await expect(page.getByText(/PLACE BETS\s+\d+s/)).toHaveCount(1);
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
    // ₱50, not the raw ₱10: advertising a floor the API rejects is the bug.
    await expect(menu.getByText("₱50", { exact: true })).toBeVisible(); // min
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
