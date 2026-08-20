import { test, expect } from "../playwright-fixture";
import type { Page } from "@playwright/test";

/**
 * Admin login → create a CMS page → edit it in the visual builder →
 * publish → verify the change is live.
 *
 * AUTH: admin sign-in is passwordless-first (magic link / SSO), so this
 * test uses the hidden "break-glass" password fallback (see
 * src/features/admin/AdminLogin.tsx) with credentials for a seeded
 * admin test user (must already exist in `admin_users`), supplied via:
 *
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 *
 * The test is skipped (not failed) when these aren't configured, since
 * there's no way to complete an authenticated flow without them.
 *
 * We deliberately avoid the builder's drag-and-drop widget tray (dnd-kit
 * pointer sequences are brittle in CI) and instead edit the page title
 * in the Left Navigator — a plain text input that's always visible and
 * is itself a real, persisted field on the page (`cms_pages.title`).
 */

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

/** Navigate to Page Manager from wherever the dashboard currently is. */
const openPageManager = async (page: Page) => {
  await page.getByRole("button", { name: /page manager/i }).click();
};

/** Find this page's row in the Page Manager table, if it's on the current page of results. */
const findPageRow = (page: Page, title: string) => page.getByRole("row", { name: new RegExp(title) });

test.describe("Admin CMS publish flow", () => {
  let createdPageTitle: string | null = null;

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup: delete the throwaway page we created so repeated
    // test runs don't pollute the CMS. Failures here must never mask the
    // test's own pass/fail result, so every step is wrapped defensively.
    if (!createdPageTitle) return;
    try {
      // The test body's page.on("dialog", ...) listener is still attached
      // to this same `page` fixture during afterEach.
      await page.goto("/admin");
      await openPageManager(page);
      const row = findPageRow(page, createdPageTitle);
      if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
        await row.getByRole("button", { name: /delete/i }).click();
      }
    } catch {
      // Non-fatal — worst case a manually-cleaned-up throwaway page remains.
    } finally {
      createdPageTitle = null;
    }
  });

  test("logs in, edits a page's title in the builder, publishes, and the live page reflects it", async ({ page }) => {
    test.skip(
      !adminEmail || !adminPassword,
      "Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (a seeded admin_users test account) to run this flow.",
    );

    // Auto-accept the native "Delete this page permanently?" confirm() in
    // case a previous run's leftover page needs clearing mid-test too.
    page.on("dialog", (dialog) => dialog.accept());

    // ── 1. Log in via the break-glass password form ──────────────────
    await page.goto("/admin");

    const signInHeading = page.getByRole("heading", { name: "Admin Sign-In" });
    await expect(signInHeading).toBeVisible();

    // Shift+click the title 5x to reveal the hidden password fallback.
    for (let i = 0; i < 5; i++) {
      await signInHeading.click({ modifiers: ["Shift"] });
    }

    const passwordInput = page.getByPlaceholder("Password");
    await expect(passwordInput).toBeVisible();

    await page.getByPlaceholder("your@email.com").fill(adminEmail!);
    await passwordInput.fill(adminPassword!);
    await page.getByRole("button", { name: /sign in with password/i }).click();

    // ── 2. Land on the dashboard ───────────────────────────────────────
    const pagesNavItem = page.getByRole("button", { name: /page manager/i });
    await expect(pagesNavItem).toBeVisible({ timeout: 20000 });
    await pagesNavItem.click();

    // ── 3. Create a new CMS page ───────────────────────────────────────
    const pageTitle = `E2E Publish ${Date.now()}`;
    await page.getByRole("button", { name: /^create page$/i }).click();
    await page.getByPlaceholder("About Us").fill(pageTitle);
    await page.getByRole("button", { name: "Create", exact: true }).click();

    const pageRow = findPageRow(page, pageTitle);
    await expect(pageRow).toBeVisible();
    createdPageTitle = pageTitle; // now eligible for afterEach cleanup

    const slug = ((await pageRow.locator("code").innerText()) || "").replace(/^\//, "").trim();
    expect(slug.length).toBeGreaterThan(0);

    // ── 4. Open it in the visual builder ────────────────────────────────
    await pageRow.getByRole("button", { name: /edit in builder/i }).click();

    const titleInput = page.getByPlaceholder("Untitled page");
    await expect(titleInput).toHaveValue(pageTitle);

    // ── 5. Edit — a real, persisted field: the page title ──────────────
    const publishedTitle = `${pageTitle} Live`;
    await titleInput.fill(publishedTitle);
    createdPageTitle = publishedTitle; // the row will now show the new title

    // ── 6. Publish ───────────────────────────────────────────────────
    const publishResponse = page.waitForResponse(
      (res) => res.url().includes("/rest/v1/cms_pages") && res.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: /publish all/i }).click();

    const response = await publishResponse;
    expect(response.ok()).toBe(true);
    await expect(page.getByText("Published", { exact: true })).toBeVisible();

    // ── 7. Verify the live page reflects the published edit ────────────
    await page.goto(`/p/${slug}`);
    const escaped = publishedTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect(page).toHaveTitle(new RegExp(`^${escaped}`));
  });
});
