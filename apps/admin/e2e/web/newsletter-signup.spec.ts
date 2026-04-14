import { test, expect, Page } from "@playwright/test";
import {
  generateTestEmail,
  waitForEmail,
  verifyEmailContent,
  extractConfirmationLink,
} from "../helpers/email";

const WEB_URL = "http://localhost:3001";

// Requires the apps/web dev server + E2E email infra — not started in CI
test.skip(
  !!process.env.CI,
  "Requires apps/web dev server + S3 email capture (not in CI)",
);

async function fillForm(
  page: Page,
  opts: { email: string; country: string; zip: string },
) {
  await page.getByTestId("newsletter-email").fill(opts.email);
  await page
    .getByTestId("newsletter-country")
    .selectOption({ value: opts.country });
  await page.getByTestId("newsletter-zip").fill(opts.zip);
}

test.describe("Newsletter Signup E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WEB_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("complete signup and email confirmation flow", async ({ page }) => {
    const testEmail = generateTestEmail("newsletter");
    const beforeSignup = new Date();

    await fillForm(page, { email: testEmail, country: "CA", zip: "H2X 1Y4" });
    await page.getByTestId("newsletter-submit").click();

    await expect(page.getByTestId("newsletter-success")).toBeVisible({
      timeout: 15000,
    });

    const email = await waitForEmail(testEmail, {
      timeout: 60000,
      after: beforeSignup,
    });
    expect(email).not.toBeNull();

    const verification = verifyEmailContent(email!, {
      subjectContains: "Welcome",
      bodyContains: "Confirm",
      fromContains: "noreply@mapyourhealth",
    });
    expect(verification.valid).toBe(true);

    const confirmLink = extractConfirmationLink(email!);
    expect(confirmLink).not.toBeNull();

    await page.goto(confirmLink!);

    await expect(
      page.getByText(/thank you for confirming/i),
    ).toBeVisible({ timeout: 15000 });
  });

  test("shows validation error for invalid email format", async ({
    page,
  }) => {
    await fillForm(page, { email: "bad-email", country: "US", zip: "10001" });

    // Dispatch submit directly to bypass native <input type="email"> validation
    await page.evaluate(() => {
      document
        .querySelector("form")
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    await expect(page.getByTestId("newsletter-error")).toBeVisible({
      timeout: 5000,
    });
  });

  test("handles duplicate email submission", async ({ page }) => {
    const testEmail = generateTestEmail("dupe");

    await fillForm(page, { email: testEmail, country: "CA", zip: "H2X" });
    await page.getByTestId("newsletter-submit").click();

    await expect(page.getByTestId("newsletter-success")).toBeVisible({
      timeout: 15000,
    });

    await page.evaluate(() => localStorage.removeItem("newsletterSubscribed"));
    await page.reload();

    await fillForm(page, { email: testEmail, country: "CA", zip: "H2X" });
    await page.getByTestId("newsletter-submit").click();

    await expect(page.getByTestId("newsletter-success")).toBeVisible({
      timeout: 15000,
    });
  });

  test("persists success state across page reload", async ({ page }) => {
    const testEmail = generateTestEmail("persist");

    await fillForm(page, { email: testEmail, country: "US", zip: "90210" });
    await page.getByTestId("newsletter-submit").click();

    await expect(page.getByTestId("newsletter-success")).toBeVisible({
      timeout: 15000,
    });

    await page.reload();
    await expect(page.getByTestId("newsletter-success")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("newsletter-form")).toHaveCount(0);
  });
});
