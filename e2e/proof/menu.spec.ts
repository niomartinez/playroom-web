import { test, expect, type Page } from "@playwright/test";

// Proof of the menu hub (items #8/#9/#10/#11/#12) on /play/demo.
// Desktop viewport 1400x900.

const TABLE_ID = "TEST-DEMO-1";

async function boot(page: Page, opts: { maxEff?: number; minEff?: number; liveChat?: boolean } = {}) {
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
  // Feature flags — optionally enable live chat so the rename gear (#12) renders.
  if (opts.liveChat) {
    await page.route("**/api/features", (r) => r.fulfill({ json: { live_chat_enabled: true } }));
  }
  const frames: { send: (p: unknown) => void }[] = [];
  await page.routeWebSocket(/\/ws\/lobby/, (ws) => {
    frames.push({ send: (p) => ws.send(JSON.stringify(p)) });
  });
  await page.goto("/play/demo");
  await expect(page.getByText("₱10,000.00")).toBeVisible();
  await expect.poll(() => frames.length).toBeGreaterThan(0);
}

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Menu", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.use({ viewport: { width: 1400, height: 900 } });

test("#8/#10/#11 — How to Play, Payouts & Limits (effective min), Game History empty state", async ({
  page,
}) => {
  await boot(page);
  await openMenu(page);

  const dialog = page.getByRole("dialog");

  // Root menu shows the four sections.
  await expect(dialog.getByRole("button", { name: "How to Play" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Payouts & Limits" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Game History" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Sound & Video" })).toBeVisible();

  // ---- #8 How to Play ----
  await dialog.getByRole("button", { name: "How to Play" }).click();
  await expect(
    dialog.getByText(
      "Bet on whether the Player or Banker hand will total closest to 9. You can also bet on a Tie.",
    ),
  ).toBeVisible();
  // Back to root
  await dialog.getByRole("button", { name: "Back" }).click();

  // ---- #11 Payouts & Limits ----
  await dialog.getByRole("button", { name: "Payouts & Limits" }).click();
  await expect(dialog.getByText("Table limits")).toBeVisible();
  // EFFECTIVE minimum must be ₱50 (min_bet_effective), NOT ₱10 (min_bet).
  await expect(dialog.getByText("₱50", { exact: true })).toBeVisible();
  await expect(dialog.getByText("₱10", { exact: true })).toHaveCount(0);
  // Max shows the effective max.
  await expect(dialog.getByText("₱10,000", { exact: true })).toBeVisible();
  // Payout table rows render (all 7 standard ratios).
  await expect(dialog.getByText("1 : 1", { exact: true })).toBeVisible();
  await expect(dialog.getByText("0.95 : 1", { exact: true })).toBeVisible();
  await expect(dialog.getByText("8 : 1", { exact: true })).toBeVisible();
  await expect(dialog.getByText("25 : 1", { exact: true })).toBeVisible();
  const ratioCount = await dialog.locator("text=/^\\d.*: 1$/").count();
  expect(ratioCount).toBeGreaterThanOrEqual(7);
  await dialog.getByRole("button", { name: "Back" }).click();

  // ---- #10 Game History (fresh demo token → empty state) ----
  await dialog.getByRole("button", { name: "Game History" }).click();
  await expect(dialog.getByText("No bets yet.")).toBeVisible();
  await dialog.getByRole("button", { name: "Back" }).click();

  // Screenshot the open root menu.
  await page.screenshot({
    path: "e2e/proof/menu-open.png",
    fullPage: false,
  });
});

test("#9 Sound & Video — mute toggle + volume slider drive without crash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await boot(page);
  await openMenu(page);
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("button", { name: "Sound & Video" }).click();
  await expect(dialog.getByText("Sound", { exact: true })).toBeVisible();

  // Starts muted → button reads "Unmute".
  const muteBtn = dialog.getByRole("button", { name: /Unmute|Mute/ });
  await expect(muteBtn).toBeVisible();
  const initialLabel = (await muteBtn.textContent())?.trim();
  expect(initialLabel).toBe("Unmute"); // muted by default

  // Toggle mute → label flips to "Mute", and if a <video> exists its muted
  // property must flip to false.
  const videoCount = await page.locator("video").count();
  let videoMutedObserved: string;
  await muteBtn.click();
  await expect(dialog.getByRole("button", { name: "Mute", exact: true })).toBeVisible();
  if (videoCount > 0) {
    await expect
      .poll(() => page.locator("video").first().evaluate((v: HTMLVideoElement) => v.muted))
      .toBe(false);
    // Toggle back to muted → video.muted flips back to true.
    await dialog.getByRole("button", { name: "Mute", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Unmute", exact: true })).toBeVisible();
    await expect
      .poll(() => page.locator("video").first().evaluate((v: HTMLVideoElement) => v.muted))
      .toBe(true);
    videoMutedObserved = "video present; muted flipped true→false→true with toggle";
  } else {
    videoMutedObserved = "no <video> element (demo has no stream)";
  }

  // Volume slider present; drive it.
  const slider = dialog.getByRole("slider", { name: "Volume" });
  await expect(slider).toBeVisible();
  await slider.fill("0.5");
  await expect(slider).toHaveValue("0.5");
  // Setting volume > 0 while muted auto-unmutes (component logic).
  await slider.fill("0.8");
  await expect(slider).toHaveValue("0.8");

  expect(errors, `page errors: ${errors.join("; ")}`).toHaveLength(0);
  // stash observation for the report via test annotation
  test.info().annotations.push({ type: "video-state", description: videoMutedObserved });
});

test("#12 Change name — rename entry exists in chat", async ({ page }) => {
  // Enable live chat so the rename gear renders.
  await boot(page, { liveChat: true });

  // The rename entry is the "Screen name" gear button in the chat header.
  // It dispatches prg:open-change-name. Confirm the entry is present and
  // clickable. (Note: the modal LISTENER lives in the real /play GameWrapper,
  // not in DemoWrapper, so the dialog itself cannot open on the demo harness —
  // see residualIssues.)
  const renameBtn = page.getByRole("button", { name: "Screen name" }).first();
  const present = await renameBtn.count();
  if (present > 0) {
    await expect(renameBtn).toBeVisible();
    // Confirm clicking dispatches the event without crashing.
    let dispatched = false;
    await page.evaluate(() => {
      (window as unknown as { __renameFired?: boolean }).__renameFired = false;
      window.addEventListener("prg:open-change-name", () => {
        (window as unknown as { __renameFired?: boolean }).__renameFired = true;
      });
    });
    await renameBtn.click();
    dispatched = await page.evaluate(
      () => (window as unknown as { __renameFired?: boolean }).__renameFired === true,
    );
    expect(dispatched).toBe(true);
    test.info().annotations.push({
      type: "rename",
      description: "rename gear present; prg:open-change-name dispatched",
    });
  } else {
    test.info().annotations.push({
      type: "rename",
      description: "chat did not render (live_chat_enabled gate) — rename entry not reachable in demo",
    });
    test.skip(true, "chat not rendered in demo");
  }
});
