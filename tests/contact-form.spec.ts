import { test, expect } from "../playwright-fixture";

/**
 * Public contact form (ContactSection → submit-contact edge function).
 *
 * This is the site's primary lead-gen surface ("Request a discovery
 * call"), so we drive it exactly the way a visitor would: fill the
 * form, submit, and confirm both the network round trip and the UI's
 * success state.
 */
test.describe("Contact form", () => {
  test("submits successfully through to a successful submit-contact response", async ({ page }) => {
    await page.goto("/");

    const contactSection = page.locator('[data-section="contact"]');
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
