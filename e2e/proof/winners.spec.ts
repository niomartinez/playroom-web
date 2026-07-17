import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

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

test("winners marquee renders with exact cents and does not replay stale round on remount", async ({
  page,
}) => {
  // Start desktop (>640px) so the desktop marquee branch mounts.
  await page.setViewportSize({ width: 1400, height: 900 });
  const { send } = await boot(page);

  // Open a betting round.
  send({ type: "RoundStarted", data: { roundId: "r1", round_number: 1, countdown: 30, tableId: TABLE_ID } });
  await page.waitForTimeout(400);

  // Fire the winners broadcast.
  send({
    type: "RoundWinners",
    data: {
      roundId: "r1",
      winners: [
        { user: "AcePlayer_1a2b", amount: 47.5 },
        { user: "BigB_9c", amount: 1200 },
      ],
      tableId: TABLE_ID,
    },
  });

  // --- Part 1: marquee appears with names + exact-cent net wins ---
  const title = page.getByText("Winners", { exact: true });
  await expect(title).toBeVisible({ timeout: 5000 });

  await expect(page.getByText("AcePlayer_1a2b")).toBeVisible();
  await expect(page.getByText("BigB_9c")).toBeVisible();
  // Exact cents — +₱47.50 (NOT the rounded +₱48).
  await expect(page.getByText("+₱47.50")).toBeVisible();
  await expect(page.getByText("+₱1,200.00")).toBeVisible();
  // Prove the rounded form is NOT what's shown.
  await expect(page.getByText("+₱48", { exact: true })).toHaveCount(0);

  // Confirm it sits top-left over the feed (absolute, top/left small).
  const box = await title.evaluate((el) => {
    const marquee = el.closest("div[aria-hidden]") as HTMLElement | null;
    const r = (marquee ?? el).getBoundingClientRect();
    return { top: r.top, left: r.left };
  });
  expect(box.top).toBeLessThan(200);
  expect(box.left).toBeLessThan(200);

  await page.screenshot({ path: path.join(SHOT_DIR, "winners-marquee.png") });

  // --- Part 2: stale-replay guard across the 640px breakpoint remount ---
  // The marquee auto-hides after SHOW_MS (9s). Let it hide NATURALLY first
  // (no resize yet) so a later reappearance can only mean a replay, not the
  // lingering first show.
  const winners = page.getByText("Winners", { exact: true });
  await expect(winners).toHaveCount(0, { timeout: 12000 });
  const hidTimestamp = Date.now();

  // Now flip across the 640px breakpoint. Each flip swaps PlayerLayout's
  // returned subtree and REMOUNTS WinnersMarquee. Do NOT resend RoundWinners.
  // If the module-level guard were absent, the remounted effect would re-fire
  // against the still-present (stale) roundWinners context value and replay r1.
  await page.setViewportSize({ width: 500, height: 900 });
  await page.waitForTimeout(700);
  const mqMobile = await page.evaluate(() => window.matchMedia("(max-width: 640px)").matches);
  const afterMobile = await winners.count();

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(700);
  const mqDesktop = await page.evaluate(() => window.matchMedia("(max-width: 640px)").matches);
  const afterDesktop = await winners.count();

  await page.screenshot({ path: path.join(SHOT_DIR, "winners-after-remount.png") });

  // The breakpoint genuinely flipped (proving the layout subtree — and thus
  // WinnersMarquee — remounted in each direction).
  expect(mqMobile).toBe(true);
  expect(mqDesktop).toBe(false);
  // The module-level guard must keep the STALE r1 round hidden after remount.
  expect(afterMobile).toBe(0);
  expect(afterDesktop).toBe(0);

  // --- Positive control: a NEW round (r2) still shows post-remount. ---
  // Proves the remounted component is alive and the guard is roundId-specific,
  // not a blanket mute.
  send({
    type: "RoundWinners",
    data: {
      roundId: "r2",
      winners: [{ user: "Fresh_r2", amount: 12.34 }],
      tableId: TABLE_ID,
    },
  });
  await expect(winners).toHaveCount(1, { timeout: 5000 });
  await expect(page.getByText("Fresh_r2")).toBeVisible();
  await expect(page.getByText("+₱12.34")).toBeVisible();

  fs.writeFileSync(
    path.join(SHOT_DIR, "winners-observed.json"),
    JSON.stringify({ box, hidTimestamp, mqMobile, mqDesktop, afterMobile, afterDesktop }, null, 2)
  );
});
