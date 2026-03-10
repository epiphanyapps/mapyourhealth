/**
 * E2E Test: City Search Functionality
 *
 * Tests searching for cities on the mobile web app.
 * Verifies dropdown results appear and selection works.
 */

import { test, expect } from "@playwright/test";

const MOBILE_APP_URL = "https://app.mapyourhealth.info";

test.describe("City Search", () => {
  test("should search for New York and display results", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    // Navigate to app
    await page.goto(MOBILE_APP_URL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Find and interact with search input
    const searchInput = page.locator("input").first();
    await expect(searchInput).toBeVisible();

    // Type search query (use "New York" not "New York City" - DB has "New York")
    await searchInput.click();
    await searchInput.fill("New York");

    // Wait for dropdown to appear with results
    await page.waitForTimeout(2000);

    // Verify dropdown results are visible
    const resultButton = page.getByRole("button", { name: "Select New York, NY" });
    await expect(resultButton).toBeVisible({ timeout: 10000 });

    // Take debug screenshot
    await page.screenshot({ path: "/tmp/debug-new-york-search.png" });

    // Click on the result
    await resultButton.click();

    // Wait for selection to process
    await page.waitForTimeout(1500);

    // Verify input is populated with selected city
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toContain("New York");

    // Verify app starts loading data
    const loadingOrContent = page.locator(
      'text="Loading safety data", text="Water Quality", text="Air Quality"'
    );
    await expect(
      loadingOrContent.first().or(page.locator("text=Follow"))
    ).toBeVisible({ timeout: 10000 });

    await context.close();
  });

  test("should display city suggestions with proper formatting", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    await page.goto(MOBILE_APP_URL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const searchInput = page.locator("input").first();
    await searchInput.click();
    await searchInput.fill("Los Ang");

    // Wait for suggestions
    await page.waitForTimeout(2000);

    // Check that suggestions appear
    const suggestions = page.locator('button[aria-label*="Select"]');
    await expect(suggestions.first()).toBeVisible({ timeout: 10000 });

    // Verify Los Angeles appears in results
    const allSuggestions = await suggestions.allTextContents();
    const hasLosAngeles = allSuggestions.some((text) =>
      text.toLowerCase().includes("los angeles")
    );
    expect(hasLosAngeles).toBe(true);

    await context.close();
  });
});
