import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const SCRATCH = "/private/tmp/claude-1175276035/-Users-antoniomartinez-Documents-GitHub-topless-casino-backend/acf91383-f142-4d40-9631-fd1c14204fb5/scratchpad";

const SENDER_TOKEN = "Fyb0aFrsyD1HCcg43--kOo9MaBSOeuCX8qeRDuNBD5tJ7bvRvAxLrmVRyJ8d_3ri";
const VIEWER_TOKEN = "CLos38e2soVVCgoIzBTVssR18VHHo_qZgegO3pmG-a-L4Bgbg02T7BY7QBWj5jDi";

function playUrl(token: string) {
  return `http://localhost:3100/play?token=${token}&game=BAC-TABLE-01&lang=en`;
}

async function openPlay(context: BrowserContext, token: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(playUrl(token), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  return page;
}

async function send(page: Page, input: ReturnType<Page["locator"]>, text: string) {
  await input.click({ force: true });
  await input.fill(text);
  await input.press("Enter");
}

test("desktop chat floats on viewer when minimized", async ({ browser }) => {
  test.setTimeout(90_000);

  const senderCtx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const viewerCtx = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  const sender = await openPlay(senderCtx, SENDER_TOKEN);
  const viewer = await openPlay(viewerCtx, VIEWER_TOKEN);

  await Promise.all([sender.waitForTimeout(3500), viewer.waitForTimeout(3500)]);

  // Minimize chat on VIEWER.
  await viewer.locator('svg path[d="M6 18L18 6M6 6l12 12"]').first().click();
  await viewer.waitForTimeout(800);
  const collapsedBtn = await viewer.locator('.absolute.right-4.top-4 button').first().textContent().catch(() => null);
  console.log("VIEWER collapsed button:", collapsedBtn);
  await viewer.screenshot({ path: `${SCRATCH}/floats-01-viewer-minimized.png` });

  const senderInput = sender.locator('input[maxlength="200"]');
  await expect(senderInput).toBeVisible({ timeout: 10000 });

  // SEND #1 — measure geometry, glass, username, text.
  const m1 = `Alpha ${Date.now() % 100000}`;
  await send(sender, senderInput, m1);
  await viewer.waitForTimeout(1200);

  const floats = viewer.locator(".prg-float-msg");
  const count1 = await floats.count();
  const text1 = count1 ? await floats.first().textContent() : null;
  const user1 = count1 ? await floats.first().locator("span").first().textContent() : null;
  let rightSide = false, box: any = null, glassy: string | null = null;
  if (count1) {
    const b = await floats.first().boundingBox();
    if (b) { box = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width) }; rightSide = b.x + b.width > 900; }
    glassy = await floats.first().evaluate((el) => { const s = getComputedStyle(el); return s.backdropFilter || (s as any).webkitBackdropFilter; });
  }
  console.log(`SEND1 count=${count1} user=${JSON.stringify(user1)} text=${JSON.stringify(text1)} box=${JSON.stringify(box)} rightSide=${rightSide} glassy=${glassy}`);
  await viewer.screenshot({ path: `${SCRATCH}/floats-02-viewer-bubble.png` });

  // AUTO-FADE — wait > TTL(5s), expect 0 with no new sends.
  await viewer.waitForTimeout(5600);
  const afterFade = await viewer.locator(".prg-float-msg").count();
  console.log("FADE afterFade (expect 0):", afterFade);
  await viewer.screenshot({ path: `${SCRATCH}/floats-03-viewer-faded.png` });

  // SEND #2 (respect 5s cooldown from send #1: ~6.8s elapsed already) — then CLICK to open.
  const senderExpired1 = await sender.locator('[role="alertdialog"]').count();
  const m2 = `Bravo ${Date.now() % 100000}`;
  let clickOpens = false, count2 = 0, user2: string | null = null;
  if (!senderExpired1) {
    await send(sender, senderInput, m2);
    await viewer.waitForTimeout(1200);
    const f = viewer.locator(".prg-float-msg");
    count2 = await f.count();
    user2 = count2 ? await f.first().locator("span").first().textContent() : null;
    console.log(`SEND2 count=${count2} user=${JSON.stringify(user2)}`);
    if (count2) {
      await f.first().click();
      await viewer.waitForTimeout(700);
      clickOpens = await viewer.locator('input[maxlength="200"]').isVisible().catch(() => false);
    }
  } else {
    console.log("SENDER expired before SEND2; skipping");
  }
  console.log("CLICK-OPENS-PANEL:", clickOpens);
  await viewer.screenshot({ path: `${SCRATCH}/floats-04-viewer-clicked-open.png` });

  console.log("SUMMARY", JSON.stringify({
    collapsedBtn, count1, user1, text1, box, rightSide, glassy, afterFade, count2, user2, clickOpens,
  }));

  await senderCtx.close();
  await viewerCtx.close();
});
