import { test, expect } from "../playwright-fixture";

/**
 * Public contact form (the "contact" CMS row, ContactRow.tsx →
 * submit-contact edge function).
 *
 * This is the site's primary lead-gen surface ("Request a discovery
 * call"), so we drive it exactly the way a visitor would: fill the
 * form, submit, and confirm both the network round trip and the UI's
 * success state.
 *
 * The contact row is admin-configurable content (added to a page like
 * any other widget), so we locate it by `data-row-type="contact"` —
 * the stable attribute every row gets from the shared RowSection
 * wrapper (src/features/site/rows/typography/RowSection.tsx:221) —
 * rather than assuming it lives at a fixed spot on the homepage.
 */
test.describe("Contact form", () => {
  test("submits successfully through to a successful submit-contact response", async ({ page }) => {
    await page.goto("/");

    const contactSection = page.locator('section[data-row-type="contact"]').first();
    test.skip(
      (await contactSection.count()) === 0,
      "No contact row found on the homepage — nothing to exercise the contact form against.",
    );
    await contactSection.scrollIntoViewIfNeeded();

    const nameInput = contactSection.locator('input[type="text"]').first();
    const emailInput = contactSection.locator('input[type="email"]');
    const messageInput = contactSection.locator("textarea");
    const submitButton = contactSection.getByRole("button", { name: /request a discovery call/i });

    await expect(nameInput).toBeVisible();

    const uniqueEmail = `e2e-contact-${Date.now()}@example.com`;
    await nameInput.fill("Playwright E2E");
    await emailInput.fill(uniqueEmail);
    await messageInput.fill("Automated end-to-end test submission — please ignore.");

    const submitResponse = page.waitForResponse(
      (res) => res.url().includes("/functions/v1/submit-contact") && res.request().method() === "POST",
    );

    await submitButton.click();

    const response = await submitResponse;
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(typeof body.id).toBe("string");

    // UI reflects the successful submission.
    await expect(page.getByRole("heading", { name: /message received/i })).toBeVisible();
  });
});
