import { test, expect } from "../playwright-fixture";

/**
 * Lead-magnet / newsletter opt-in (<SubscribeWidget/>), also routed
 * through the submit-contact edge function with
 * `subscribed_to_marketing: true`.
 *
 * <SubscribeWidget/> is placed on most content rows behind an
 * admin-configurable "show subscribe" toggle, but every blog post
 * renders it unconditionally at the bottom of the article
 * (src/pages/BlogPost.tsx) — the one placement guaranteed to exist
 * regardless of CMS configuration, so we drive the flow from there.
 */
test.describe("Subscribe widget", () => {
  test("subscribes successfully through to a successful submit-contact response", async ({ page }) => {
    await page.goto("/blog");

    // Scoped to <article> (each BlogCard) so we don't also match the
    // Navbar's own "/blog/" link.
    const postLinks = page.locator('article a[href^="/blog/"]');
    test.skip(
      (await postLinks.count()) === 0,
      "No published blog posts found — nothing to exercise the SubscribeWidget against.",
    );

    await postLinks.first().click();

    await page.waitForURL(/\/blog\/.+/);

    // Scoped with `.last()`: the article body may itself contain other
    // rows with their own subscribe widget enabled, but BlogPost.tsx
    // always renders one unconditionally at the very bottom of the
    // page — that's the guaranteed, last-in-DOM instance we want.
    const subscribeTrigger = page.getByRole("button", { name: /keep me updated with insights/i }).last();
    await subscribeTrigger.scrollIntoViewIfNeeded();
    await expect(subscribeTrigger).toBeVisible();
    await subscribeTrigger.click();

    const nameInput = page.getByPlaceholder("Your name");
    const emailInput = page.getByPlaceholder("Email address");
    const subscribeButton = page.getByRole("button", { name: /^subscribe$/i });

    await expect(nameInput).toBeVisible();

    const uniqueEmail = `e2e-subscribe-${Date.now()}@example.com`;
    await nameInput.fill("Playwright Subscriber");
    await emailInput.fill(uniqueEmail);

    const submitResponse = page.waitForResponse(
      (res) => res.url().includes("/functions/v1/submit-contact") && res.request().method() === "POST",
    );

    await subscribeButton.click();

    const response = await submitResponse;
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // UI reflects the successful subscription.
    await expect(page.getByText(/you're on the list/i)).toBeVisible();
  });
});
