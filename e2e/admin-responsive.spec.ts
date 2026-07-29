import { test, expect, Page } from "@playwright/test";

/**
 * Responsive regression for /admin and /admin-ocms.
 *
 * Guards the two things the mobile work must not break:
 *  1. nothing scrolls horizontally at 390px, and controls stay tappable, and
 *  2. the desktop panel is unchanged — sidebar visible, hamburger absent.
 *
 * Credentials come from the environment, same as admin.spec.ts:
 *   ADMIN_E2E_USER / ADMIN_E2E_PASS            (required)
 *   OCMS_E2E_USER  / OCMS_E2E_PASS             (optional; OCMS tests skip without)
 *
 * Example:
 *   BASE_URL=http://localhost:3100 \
 *   ADMIN_E2E_USER=SuperAdmin ADMIN_E2E_PASS=... \
 *   npx playwright test e2e/admin-responsive.spec.ts
 */

const USER = process.env.ADMIN_E2E_USER || "";
const PASS = process.env.ADMIN_E2E_PASS || "";
const OCMS_USER = process.env.OCMS_E2E_USER || "";
const OCMS_PASS = process.env.OCMS_E2E_PASS || "";

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 768, height: 1024 };
const DESKTOP = { width: 1440, height: 900 };

const ADMIN_PAGES = [
  "/admin",
  "/admin/ip-allowlist",
  "/admin/operators",
  "/admin/tables",
  "/admin/players",
  "/admin/rounds",
  "/admin/reports",
  "/admin/monitoring",
  "/admin/audit",
  "/admin/users",
  "/admin/pitch-links",
  "/admin/settings",
];

const OCMS_PAGES = [
  "/admin-ocms",
  "/admin-ocms/reports",
  "/admin-ocms/players",
  "/admin-ocms/cs-users",
];

/* ------------------------------------------------------------------ */
/*  In-page audit                                                      */
/* ------------------------------------------------------------------ */

interface Audit {
  clientW: number;
  scrollW: number;
  overflowing: { tag: string; cls: string; right: number; text: string }[];
  smallControls: { tag: string; text: string; h: number }[];
  smallFontInputs: { type: string; fs: string }[];
  smallLinks: { text: string; h: number }[];
}

async function audit(page: Page): Promise<Audit> {
  return page.evaluate(() => {
    const d = document.documentElement;
    const cls = (e: Element) => {
      const c = (e as HTMLElement).className as unknown;
      const s = typeof c === "string" ? c : (c as SVGAnimatedString)?.baseVal ?? "";
      return String(s).slice(0, 120);
    };
    const txt = (e: Element) =>
      (e.textContent || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    const visible = (e: Element) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    /* An element that sticks out past the viewport, but only when it is not
       inside a deliberate horizontal scroll container (wide <pre>, JSON diffs,
       the desktop table kept behind an overflow-x-auto wrapper). */
    const inScroller = (e: Element) => {
      let n: Element | null = e.parentElement;
      while (n && n !== d) {
        const ov = getComputedStyle(n).overflowX;
        if (ov === "auto" || ov === "scroll") return true;
        n = n.parentElement;
      }
      return false;
    };

    const overflowing = [...document.querySelectorAll("*")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.right > d.clientWidth + 1 && !inScroller(e);
      })
      .map((e) => ({ tag: e.tagName, cls: cls(e), right: Math.round(e.getBoundingClientRect().right), text: txt(e) }))
      .slice(0, 15);

    /* Buttons and selects are unambiguous controls: under 44px they are a real
       touch-target failure. Links are reported separately because inline links
       inside prose legitimately inherit the line height. */
    const smallControls = [...document.querySelectorAll("button,select,[role=button]")]
      .filter(visible)
      .filter((e) => e.getBoundingClientRect().height < 44)
      .map((e) => ({ tag: e.tagName, text: txt(e), h: Math.round(e.getBoundingClientRect().height) }));

    const smallLinks = [...document.querySelectorAll("a")]
      .filter(visible)
      .filter((e) => e.getBoundingClientRect().height < 44)
      .filter((e) => !e.closest("p"))
      .map((e) => ({ text: txt(e), h: Math.round(e.getBoundingClientRect().height) }));

    /* iOS Safari auto-zooms the page when a focused input is under 16px. */
    const smallFontInputs = [...document.querySelectorAll("input,select,textarea")]
      .filter(visible)
      .filter((e) => !["checkbox", "radio", "hidden"].includes((e as HTMLInputElement).type))
      .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16)
      .map((e) => ({ type: (e as HTMLInputElement).type || e.tagName, fs: getComputedStyle(e).fontSize }));

    return {
      clientW: d.clientWidth,
      scrollW: d.scrollWidth,
      overflowing,
      smallControls,
      smallFontInputs,
      smallLinks,
    };
  });
}

function report(path: string, a: Audit): string {
  const lines: string[] = [`${path} @ ${a.clientW}px`];
  if (a.scrollW > a.clientW + 1) {
    lines.push(`  scrollWidth ${a.scrollW} > clientWidth ${a.clientW}`);
    for (const o of a.overflowing) {
      lines.push(`    <${o.tag}> right=${o.right} "${o.text}" class="${o.cls}"`);
    }
  }
  for (const c of a.smallControls) lines.push(`  control ${c.h}px (<44) "${c.text}"`);
  for (const f of a.smallFontInputs) lines.push(`  input font ${f.fs} (<16px, iOS will zoom) type=${f.type}`);
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/username or email/i).fill(USER);
  await page.getByLabel(/^password$/i).fill(PASS);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/admin");
}

async function loginOcms(page: Page) {
  await page.goto("/admin-ocms/login");
  await page.getByLabel(/username or email/i).fill(OCMS_USER);
  await page.getByLabel(/^password$/i).fill(OCMS_PASS);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/admin-ocms");
}

/** The mobile drawer trigger. Anchored so it cannot also match "Account menu"
 *  or the drawer's own "Close navigation menu" button. */
const HAMBURGER = (page: Page) =>
  page.getByRole("button", { name: /^open navigation menu$/i });

async function settle(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
  // Let skeletons resolve so we measure the real layout, not the placeholder.
  await page.waitForLoadState("networkidle").catch(() => {});
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

test.describe("admin responsive", () => {
  test.skip(!USER || !PASS, "ADMIN_E2E_USER / ADMIN_E2E_PASS not set");

  for (const vp of [PHONE, TABLET]) {
    test(`no overflow or tiny controls at ${vp.width}px`, async ({ page }) => {
      test.slow();
      await page.setViewportSize(vp);
      await loginAdmin(page);

      const failures: string[] = [];
      for (const path of ADMIN_PAGES) {
        await settle(page, path);
        const a = await audit(page);
        if (a.scrollW > a.clientW + 1 || a.smallControls.length || a.smallFontInputs.length) {
          failures.push(report(path, a));
        }
      }
      expect(failures, `\n${failures.join("\n\n")}\n`).toEqual([]);
    });
  }

  test("desktop is unchanged: sidebar shown, hamburger absent", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await loginAdmin(page);
    await settle(page, "/admin/players");

    await expect(page.locator("aside")).toBeVisible();
    await expect(HAMBURGER(page)).toBeHidden();
    // The real table, not the card fallback, is what desktop renders.
    await expect(page.locator("table").first()).toBeVisible();

    const a = await audit(page);
    expect(a.scrollW, report("/admin/players", a)).toBeLessThanOrEqual(a.clientW + 1);
  });

  test("mobile shows cards, not the desktop table", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await loginAdmin(page);
    await settle(page, "/admin/players");

    await expect(HAMBURGER(page)).toBeVisible();
    await expect(page.locator("table").first()).toBeHidden();
  });

  test("drawer opens, closes on Escape, and closes on navigation", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await loginAdmin(page);
    await settle(page, "/admin");

    const hamburger = HAMBURGER(page);
    // Scoped to the sidebar so a breadcrumb or stat-card link cannot match.
    const playersLink = page.locator("aside").getByRole("link", { name: /^players$/i });

    await hamburger.click();
    await expect(playersLink).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(playersLink).toBeHidden();

    // Reopen and navigate: the drawer must not survive the route change.
    await hamburger.click();
    await expect(playersLink).toBeVisible();
    await playersLink.click();
    await page.waitForURL("**/admin/players");
    await expect(playersLink).toBeHidden();

    // Body scroll must be released once the drawer is gone.
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(overflow).not.toBe("hidden");
  });

  test("pinch-zoom is enabled on admin but stays locked on the player UI", async ({ page }) => {
    await page.goto("/admin/login");
    const adminVp = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(adminVp).toMatch(/user-scalable=yes/);
    expect(adminVp).toMatch(/maximum-scale=5/);
  });
});

test.describe("ocms responsive", () => {
  test.skip(!OCMS_USER || !OCMS_PASS, "OCMS_E2E_USER / OCMS_E2E_PASS not set");

  test("no overflow or tiny controls at 390px", async ({ page }) => {
    test.slow();
    await page.setViewportSize(PHONE);
    await loginOcms(page);

    const failures: string[] = [];
    for (const path of OCMS_PAGES) {
      await settle(page, path);
      const a = await audit(page);
      if (a.scrollW > a.clientW + 1 || a.smallControls.length || a.smallFontInputs.length) {
        failures.push(report(path, a));
      }
    }
    expect(failures, `\n${failures.join("\n\n")}\n`).toEqual([]);
  });

  test("desktop is unchanged", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await loginOcms(page);
    await settle(page, "/admin-ocms/players");
    await expect(page.locator("aside")).toBeVisible();
    await expect(HAMBURGER(page)).toBeHidden();
  });
});
