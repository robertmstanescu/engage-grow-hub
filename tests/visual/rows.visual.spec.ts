import { test, expect, type Page } from "@playwright/test";
import { PILLAR_COLORS } from "../../src/lib/constants/pillarColors";

/**
 * Visual baseline for every row on every public page.
 *
 * WHY: the cleanup phases delete dependencies and rewire editors. This
 * is the proof they did not move a pixel on the public site. Each row
 * is screenshotted individually (located by `data-row-type`, the stable
 * attribute RowSection puts on every row) so a diff names the exact row
 * and page, plus one full-page shot per route for layout drift between
 * rows.
 *
 * Baseline lives in tests/visual/__snapshots__. Refresh it deliberately
 * with `npm run test:visual:update` after an intentional design change.
 */

const ROUTES = [
  "/",
  "/services/",
  ...Object.keys(PILLAR_COLORS).map((slug) => `/services/${slug}/`),
  "/p/about-us/",
  "/blog",
];

const fileSafe = (route: string) =>
  route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "_");

/**
 * Rows reveal on scroll (IntersectionObserver + opacity transition), and
 * images are lazy. Walk the page once so everything has been in view,
 * then wait for fonts and network to settle.
 */
const settle = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await (document as any).fonts?.ready;
  });
  await page.waitForLoadState("networkidle");
};

for (const route of ROUTES) {
  test(`rows on ${route}`, async ({ page }) => {
    await page.goto(route);
    await settle(page);

    const rows = page.locator("section[data-row-type]");
    const count = await rows.count();
    test.skip(count === 0, `No CMS rows rendered on ${route}`);

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const type = await row.getAttribute("data-row-type");
      await row.scrollIntoViewIfNeeded();
      await expect(row).toHaveScreenshot(`${fileSafe(route)}--${String(i).padStart(2, "0")}-${type}.png`);
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot(`${fileSafe(route)}--full.png`, { fullPage: true });
  });
}
