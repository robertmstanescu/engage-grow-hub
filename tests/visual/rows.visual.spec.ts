import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
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

const HIDE_CHROME = fileURLToPath(new URL("./hide-chrome.css", import.meta.url));

const fileSafe = (route: string) =>
  route === "/"
    ? "home"
    : route
        .replace(/^\/|\/$/g, "")
        .replace(/\//g, "_")
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "-")
        .replace(/^-+|-+$/g, "");

test.beforeEach(async ({ page }) => {
  // Decide the cookie question up front so the consent dialog never
  // overlaps a row, and so the run sets no tracking cookie.
  await page.addInitScript(() => {
    window.localStorage.setItem("tmc_analytics_consent_v1", "rejected");
  });
});

/**
 * Rows reveal on scroll (IntersectionObserver + opacity transition), and
 * images are lazy. Walk the page once so everything has been in view,
 * then wait for every image to finish loading and fonts to be ready.
 */
const settle = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  // The public pages scroll inside a viewport-height `.snap-container`
  // (Index.tsx / CmsPage.tsx), not the window. Playwright's full-page and
  // taller-than-viewport element captures scroll the *window*, so with
  // the inner container in place the full-page shot is one viewport tall
  // and tall rows are captured from two different scroll offsets and
  // never stabilise. Let the document scroll normally for the shot, and
  // turn off smooth scrolling so scrollIntoView lands instantly.
  await page.addStyleTag({
    content: `
      html, body, * { scroll-behavior: auto !important; }
      .snap-container { height: auto !important; overflow: visible !important; }
      .snap-section { scroll-snap-align: none !important; }
    `,
  });
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
    );
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  });
  await page.waitForLoadState("networkidle");
};

for (const route of ROUTES) {
  test(`rows on ${route}`, async ({ page }) => {
    await page.goto(route);
    await settle(page);

    // One <section> per row, whatever its shape:
    // - a single-widget row is painted by the widget itself: its section
    //   carries data-row-id (the widget id) and data-row-type;
    // - a multi-widget row (or one with a row cover picture) is painted
    //   ONCE by RowRenderer: the outer section carries data-row-id and
    //   data-row-title, and the widgets inside render as plain divs;
    // - the homepage hero is not a CMS row at all: data-section="hero".
    // Matching only data-row-type used to skip the second and third kinds,
    // so the About page's hero band and cover row were never captured.
    // A hero widget inside a multi-widget row still renders its own
    // data-section="hero" section; that one is nested in the row's
    // section and already inside its shot, so it is excluded.
    const rows = page.locator(
      'section[data-row-id], section[data-section="hero"]:not([data-row-id] *)',
    );
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const name =
        (await row.getAttribute("data-row-type")) ||
        fileSafe((await row.getAttribute("data-row-title")) || "") ||
        (await row.getAttribute("data-section")) ||
        "row";
      await row.scrollIntoViewIfNeeded();
      await expect(row).toHaveScreenshot(
        `${fileSafe(route)}--${String(i).padStart(2, "0")}-${name}.png`,
        { stylePath: HIDE_CHROME },
      );
    }

    // Routes not built from CMS rows (e.g. /blog) get one full-page shot
    // instead. Row pages don't: each row's shot already includes its own
    // padding, and a full-page PNG is ~2 MB per route in the repo.
    if (count === 0) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page).toHaveScreenshot(`${fileSafe(route)}--full.png`, { fullPage: true });
    }
  });
}
