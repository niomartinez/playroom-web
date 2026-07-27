import { test, expect, webkit, chromium, type Browser } from "@playwright/test";

/**
 * Operator iframe launch — the token must survive a cross-site embed.
 *
 * The operator (OCMS / gamespot88.com) iframes us:
 *
 *   <iframe src="https://app.playroomgaming.ph/play?token=…&game=…">
 *
 * F-10 moved the token out of the URL and into an HttpOnly cookie set by
 * /api/play/handoff. Inside a cross-site iframe that cookie is a THIRD-PARTY
 * cookie. Chrome stores it (CHIPS / `Partitioned`), but WebKit — i.e. every
 * browser on iOS, plus desktop Safari — refuses third-party cookie writes
 * outright and does not implement CHIPS. The handoff then bounced the player
 * to a token-less /play and they got "Session Required".
 *
 * We run the SAME scenario on both engines:
 *   - chromium: the cookie sticks (the fast path stays intact)
 *   - webkit:   the cookie is dropped, so the launch must fall back to the
 *               token still on the URL rather than dead-ending
 *
 * The token doesn't have to be valid — "Session Required" is rendered purely
 * from a MISSING token, before any backend call. A bogus token proves the
 * plumbing without needing a live session.
 *
 * Target a real https origin (SameSite=None cookies need Secure):
 *   BASE_URL=https://staging-app.playroomgaming.ph npx playwright test iframe-launch
 */

const BASE = process.env.BASE_URL || "https://staging-app.playroomgaming.ph";
const OPERATOR_ORIGIN = "https://operator-embed.test";
const FAKE_TOKEN = "e2e-iframe-launch-probe-token";

/** Stand up a fake operator page whose only content is our game iframe. */
async function launchInOperatorIframe(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  const src = `${BASE}/play?token=${FAKE_TOKEN}&game=1&lang=en&lobbyUrl=${encodeURIComponent(
    OPERATOR_ORIGIN,
  )}`;

  await page.route(`${OPERATOR_ORIGIN}/`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><title>operator</title>
             <iframe src="${src}" style="width:100%;height:100vh;border:0"></iframe>`,
    }),
  );

  await page.goto(`${OPERATOR_ORIGIN}/`);
  const frame = page.frameLocator("iframe");
  // Give the handoff redirect chain time to settle before asserting.
  await page.waitForTimeout(6000);
  return { context, page, frame };
}

for (const [engineName, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
] as const) {
  test(`operator iframe launch keeps the session — ${engineName}`, async () => {
    test.setTimeout(90_000);
    const browser = await engine.launch();
    try {
      const { context, frame } = await launchInOperatorIframe(browser);
      await expect(
        frame.getByText("Session Required"),
        `${engineName}: the player dead-ended on "Session Required" — the ` +
          `launch token did not survive the cross-site iframe handoff`,
      ).toHaveCount(0);
      await context.close();
    } finally {
      await browser.close();
    }
  });
}
