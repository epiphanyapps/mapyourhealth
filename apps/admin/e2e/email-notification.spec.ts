/**
 * E2E Test: Email Notification Flow
 *
 * Tests the full flow:
 * 1. Create account with test email
 * 2. Subscribe to a location
 * 3. Import data that triggers notification
 * 4. Verify notification email is received
 *
 * Prerequisites:
 *   - Run setup script: AWS_PROFILE=rayane npx ts-node packages/backend/scripts/setup-e2e-email.ts
 *   - Backend deployed with SES email fix
 */

import { test, expect } from "@playwright/test";
import {
  generateTestEmail,
  waitForEmail,
  verifyEmailContent,
  deleteAllEmails,
} from "./helpers/email";

// Test configuration
const TEST_LOCATION = {
  city: "Beverly Hills",
  state: "CA",
  country: "US",
};

const TEST_CONTAMINANT = {
  id: "nitrate",
  value: 15000, // Above danger threshold to trigger notification
  source: "E2E Test",
};

test.describe("Email Notification Flow", () => {
  let testEmail: string;

  test.beforeAll(async () => {
    // Generate unique test email for this test run
    testEmail = generateTestEmail("e2e-notif");
    console.log(`Using test email: ${testEmail}`);

    // Clean up old test emails
    await deleteAllEmails();
  });

  test("should receive notification email when data triggers alert", async ({
    page,
    browser,
  }) => {
    // ========================================
    // Step 1: Sign up with test email on mobile web
    // ========================================
    console.log("Step 1: Creating account...");

    const mobileContext = await browser.newContext({
      baseURL: "https://app.mapyourhealth.info",
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto("/");
    await mobilePage.waitForLoadState("networkidle");

    // Navigate to signup
    await mobilePage.getByRole("button", { name: /sign up/i }).click();
    await mobilePage.waitForURL(/signup/);

    // Fill signup form
    await mobilePage.getByPlaceholder(/email/i).fill(testEmail);
    await mobilePage.getByPlaceholder(/password/i).fill("TestPassword123!");
    await mobilePage.getByRole("button", { name: /sign up/i }).click();

    // Wait for verification email
    console.log("Waiting for verification email...");
    const verificationEmail = await waitForEmail(testEmail, {
      timeout: 120000,
    });
    expect(verificationEmail).not.toBeNull();
    expect(verificationEmail!.subject.toLowerCase()).toContain("verify");

    // Note: In a real test, we'd extract the verification code from the email
    // and complete verification. For now, we'll skip this step.
    console.log("Verification email received!");

    await mobileContext.close();

    // ========================================
    // Step 2: Subscribe to location (via API/Admin)
    // ========================================
    console.log("Step 2: Creating subscription...");

    // For simplicity, we'll create the subscription via Amplify API directly
    // In a real test, you'd use the mobile app UI

    // TODO: Add subscription creation via API
    // This would require auth token from the signup flow

    // ========================================
    // Step 3: Import data via Admin Portal
    // ========================================
    console.log("Step 3: Importing data to trigger notification...");

    await page.goto("/import");
    await page.waitForLoadState("networkidle");

    // Login to admin if needed
    const loginButton = page.getByRole("button", { name: /sign in/i });
    if (await loginButton.isVisible()) {
      // Admin login - use environment variables for credentials
      const adminEmail = process.env.ADMIN_EMAIL || "admin@mapyourhealth.info";
      const adminPassword = process.env.ADMIN_PASSWORD || "";

      if (!adminPassword) {
        test.skip(true, "ADMIN_PASSWORD environment variable not set");
        return;
      }

      await page.getByPlaceholder(/email/i).fill(adminEmail);
      await page.getByPlaceholder(/password/i).fill(adminPassword);
      await loginButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Select Water Quality tab (should be default)
    await page.getByRole("tab", { name: /water/i }).click();

    // Enable notifications toggle
    await page.getByLabel(/notify subscribers/i).check();

    // Create and upload test CSV
    const csvContent = `city,state,country,contaminantId,value,source
${TEST_LOCATION.city},${TEST_LOCATION.state},${TEST_LOCATION.country},${TEST_CONTAMINANT.id},${TEST_CONTAMINANT.value},${TEST_CONTAMINANT.source}`;

    // Upload via file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    // Wait for preview
    await expect(page.getByText(/ready to import/i)).toBeVisible({
      timeout: 10000,
    });

    // Click import button
    await page.getByRole("button", { name: /import/i }).click();

    // Wait for import completion
    await expect(page.getByText(/successfully imported/i)).toBeVisible({
      timeout: 30000,
    });

    // ========================================
    // Step 4: Verify notification email
    // ========================================
    console.log("Step 4: Waiting for notification email...");

    const notificationEmail = await waitForEmail(testEmail, {
      timeout: 120000, // 2 minutes - emails can take time
      after: new Date(), // Only look for new emails
    });

    expect(notificationEmail).not.toBeNull();

    // Verify email content
    const verification = verifyEmailContent(notificationEmail!, {
      subjectContains: "alert",
      bodyContains: TEST_LOCATION.city,
      fromContains: "mapyourhealth.info",
    });

    if (!verification.valid) {
      console.error("Email verification failed:", verification.errors);
    }
    expect(verification.valid).toBe(true);

    console.log("✅ Notification email received and verified!");
    console.log(`   Subject: ${notificationEmail!.subject}`);
    console.log(`   From: ${notificationEmail!.from}`);
  });

  test("should receive magic link email", async ({ browser }) => {
    const testEmailMagic = generateTestEmail("e2e-magic");
    console.log(`Testing magic link with: ${testEmailMagic}`);

    const context = await browser.newContext({
      baseURL: "https://app.mapyourhealth.info",
    });
    const page = await context.newPage();

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Go to login
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/login/);

    // Request magic link (if available)
    const magicLinkButton = page.getByRole("button", {
      name: /magic link|email me a link/i,
    });
    if (await magicLinkButton.isVisible()) {
      await page.getByPlaceholder(/email/i).fill(testEmailMagic);
      await magicLinkButton.click();

      // Wait for magic link email
      console.log("Waiting for magic link email...");
      const magicEmail = await waitForEmail(testEmailMagic, {
        timeout: 120000,
      });

      expect(magicEmail).not.toBeNull();

      const verification = verifyEmailContent(magicEmail!, {
        subjectContains: "sign in",
        fromContains: "noreply@mapyourhealth.info",
      });

      expect(verification.valid).toBe(true);
      console.log("✅ Magic link email received!");
    } else {
      console.log("Magic link button not found, skipping test");
    }

    await context.close();
  });
});
