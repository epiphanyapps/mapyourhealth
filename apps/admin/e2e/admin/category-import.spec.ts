import { test, expect } from "@playwright/test";
import { testUrls, adminCredentials } from "../fixtures/test-data";

/**
 * E2E-007: Category Import Sections
 *
 * Tests for the admin import page category tabs (#63).
 * Verifies that each category has its own import section with correct CSV format.
 *
 * These tests require admin credentials to be set via environment variables:
 * - ADMIN_TEST_EMAIL
 * - ADMIN_TEST_PASSWORD
 */

// Check if real credentials are configured
const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

test.describe("E2E-007: Category Import Sections", () => {
  // Skip all tests in this describe block if credentials aren't configured
  test.skip(
    !hasRealCredentials,
    "Skipping - requires ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD env vars",
  );

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${testUrls.admin}/login`);

    // Fill login form
    await page.fill("input#email", adminCredentials.email);
    await page.fill("input#password", adminCredentials.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(`${testUrls.admin}/`, { timeout: 30000 });

    // Navigate to Import page
    await page.goto(`${testUrls.admin}/import`);
    await page.waitForLoadState("networkidle");
  });

  test("shows all 3 category tabs", async ({ page }) => {
    // Verify all category tabs are visible
    await expect(
      page.getByRole("tab", { name: /water quality/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /air pollution/i }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /pathogens/i })).toBeVisible();
  });

  test("Water Quality tab shows correct CSV format", async ({ page }) => {
    // Click Water Quality tab (should be default, but click to be sure)
    await page.getByRole("tab", { name: /water quality/i }).click();

    // Verify tab is active
    await expect(
      page.getByRole("tab", { name: /water quality/i }),
    ).toHaveAttribute("data-state", "active");

    // Verify category description is shown
    await expect(
      page.getByText(/import contaminant measurements/i),
    ).toBeVisible();

    // Verify CSV format section shows required fields
    await expect(page.getByText("CSV Format")).toBeVisible();
    await expect(
      page.getByText(/city.*state.*country.*contaminantId.*value/i),
    ).toBeVisible();

    // Verify example data is shown
    await expect(page.getByText(/Beverly Hills/)).toBeVisible();
  });

  test("Air Pollution tab shows correct CSV format", async ({ page }) => {
    // Click Air Pollution tab
    await page.getByRole("tab", { name: /air pollution/i }).click();

    // Verify tab is active
    await expect(
      page.getByRole("tab", { name: /air pollution/i }),
    ).toHaveAttribute("data-state", "active");

    // Verify category description is shown
    await expect(page.getByText(/air quality data.*radon/i)).toBeVisible();

    // Verify CSV format shows radon-specific fields
    await expect(page.getByText("CSV Format")).toBeVisible();
    await expect(page.getByText(/radon/i)).toBeVisible();
    await expect(page.getByText(/pCi\/L/i)).toBeVisible();
  });

  test("Pathogens tab shows correct CSV format", async ({ page }) => {
    // Click Pathogens tab
    await page.getByRole("tab", { name: /pathogens/i }).click();

    // Verify tab is active
    await expect(page.getByRole("tab", { name: /pathogens/i })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Verify category description is shown
    await expect(page.getByText(/disease incidence.*lyme/i)).toBeVisible();

    // Verify CSV format shows pathogen-specific fields
    await expect(page.getByText("CSV Format")).toBeVisible();
    await expect(page.getByText(/lyme_disease/i)).toBeVisible();
    await expect(page.getByText(/incidence per 100k/i)).toBeVisible();
  });

  test("switching tabs clears preview data", async ({ page }) => {
    // Start on Water Quality tab
    await page.getByRole("tab", { name: /water quality/i }).click();

    // Verify upload button is visible
    await expect(
      page.getByRole("button", { name: /upload.*csv.*json/i }),
    ).toBeVisible();

    // Switch to Air Pollution tab
    await page.getByRole("tab", { name: /air pollution/i }).click();

    // Verify the upload card now shows Air Pollution context
    await expect(page.getByText(/upload air pollution data/i)).toBeVisible();

    // Switch to Pathogens tab
    await page.getByRole("tab", { name: /pathogens/i }).click();

    // Verify the upload card now shows Pathogens context
    await expect(page.getByText(/upload pathogens data/i)).toBeVisible();
  });

  test("upload button exists and is enabled", async ({ page }) => {
    // Verify upload button is visible and clickable
    const uploadButton = page.getByRole("button", {
      name: /upload.*csv.*json/i,
    });
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toBeEnabled();
  });

  test("shows JSON format example alongside CSV", async ({ page }) => {
    // Verify both format cards are visible
    await expect(page.getByText("CSV Format")).toBeVisible();
    await expect(page.getByText("JSON Format")).toBeVisible();

    // Verify JSON example contains expected structure
    await expect(page.getByText(/"city"/)).toBeVisible();
    await expect(page.getByText(/"contaminantId"/)).toBeVisible();
  });
});

test.describe("Category Import - No Auth", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    // Try to access import page directly without login
    await page.goto(`${testUrls.admin}/import`);

    // Should be redirected to login
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });
});
