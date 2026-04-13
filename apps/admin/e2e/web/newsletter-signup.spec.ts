import { test, expect } from "@playwright/test";
import {
  generateTestEmail,
  waitForEmail,
  verifyEmailContent,
  extractConfirmationLink,
} from "../helpers/email";

const WEB_URL = "http://localhost:3001";

test.describe("Newsletter Signup E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto(WEB_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("complete signup and email confirmation flow", async ({ page }) => {
    const testEmail = generateTestEmail("newsletter");
    const beforeSignup = new Date();

    // Fill the signup form
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.selectOption("select", { value: "CA" });
    await page.fill('input[placeholder="Zip Code"]', "H2X 1Y4");
    await page.click('button[type="submit"]');

    // Wait for success state
    await expect(
      page.locator("text=Thank you for signing up"),
    ).toBeVisible({ timeout: 15000 });

    // Wait for the confirmation email to arrive in S3
    const email = await waitForEmail(testEmail, {
      timeout: 60000,
      after: beforeSignup,
    });
    expect(email).not.toBeNull();

    // Verify email content
    const verification = verifyEmailContent(email!, {
      subjectContains: "Welcome",
      bodyContains: "Confirm",
      fromContains: "noreply@mapyourhealth",
    });
    expect(verification.valid).toBe(true);

    // Extract and navigate to confirmation link
    const confirmLink = extractConfirmationLink(email!);
    expect(confirmLink).not.toBeNull();

    await page.goto(confirmLink!);

    // Verify confirmation success
    await expect(
      page.locator("text=Thank you for confirming"),
    ).toBeVisible({ timeout: 15000 });
  });

  test("shows validation error for invalid email format", async ({
    page,
  }) => {
    // Type invalid email and fill other fields
    await page.fill('input[placeholder="Enter your email"]', "bad-email");
    await page.selectOption("select", { value: "US" });
    await page.fill('input[placeholder="Zip Code"]', "10001");

    // Submit via JS to bypass HTML5 validation
    await page.evaluate(() => {
      document.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    // Should show validation error
    await expect(page.locator(".text-red-400")).toBeVisible({
      timeout: 5000,
    });
  });

  test("handles duplicate email submission", async ({ page }) => {
    const testEmail = generateTestEmail("dupe");

    // First signup
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.selectOption("select", { value: "CA" });
    await page.fill('input[placeholder="Zip Code"]', "H2X");
    await page.click('button[type="submit"]');

    await expect(
      page.locator("text=Thank you for signing up"),
    ).toBeVisible({ timeout: 15000 });

    // Clear localStorage and reload to reset form
    await page.evaluate(() => localStorage.removeItem("newsletterSubscribed"));
    await page.reload();

    // Second signup with same email
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.selectOption("select", { value: "CA" });
    await page.fill('input[placeholder="Zip Code"]', "H2X");
    await page.click('button[type="submit"]');

    // Should show already registered message
    await expect(
      page.locator("text=already been registered"),
    ).toBeVisible({ timeout: 15000 });
  });

  test("persists success state across page reload", async ({ page }) => {
    const testEmail = generateTestEmail("persist");

    // Complete signup
    await page.fill('input[placeholder="Enter your email"]', testEmail);
    await page.selectOption("select", { value: "US" });
    await page.fill('input[placeholder="Zip Code"]', "90210");
    await page.click('button[type="submit"]');

    await expect(
      page.locator("text=Thank you for signing up"),
    ).toBeVisible({ timeout: 15000 });

    // Reload and verify success state persists
    await page.reload();
    await expect(
      page.locator("text=Thank you for signing up"),
    ).toBeVisible({ timeout: 5000 });

    // Form should NOT be visible
    await expect(
      page.locator('input[placeholder="Enter your email"]'),
    ).not.toBeVisible();
  });
});
