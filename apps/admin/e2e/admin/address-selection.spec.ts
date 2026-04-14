import { test, expect } from '@playwright/test';

/**
 * E2E tests for address selection functionality
 *
 * Tests the flow where a user searches for a specific address
 * and the app resolves it to the nearest city in the database.
 */

// These tests hit the live production app and depend on Google Places API — skip in CI
test.skip(!!process.env.CI, 'Requires live production app and Google Places API');

test.describe('Address Selection', () => {
  test('should resolve address to nearest city and display data', async ({ page }) => {
    // Navigate to app
    await page.goto('https://app.mapyourhealth.info', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for app to initialize
    await page.waitForTimeout(2000);

    // Search for a specific address
    const searchInput = page.locator('input').first();
    await searchInput.click();
    await searchInput.fill('17 Godfrey Ave, Bayville NY');

    // Wait for Google Places suggestions to load
    await page.waitForTimeout(3000);

    // Verify suggestion appears
    const addressSuggestion = page.locator('button:has-text("Godfrey")').first();
    await expect(addressSuggestion).toBeVisible({ timeout: 10000 });

    // Click the address suggestion
    await addressSuggestion.click();

    // Wait for place details resolution and data loading
    await page.waitForTimeout(5000);

    // Verify the nearest city is displayed in the input
    await expect(searchInput).toHaveValue(/New York/i, { timeout: 10000 });

    // Verify location header shows the resolved city
    const locationHeader = page.locator('text=/New York, NY/').first();
    await expect(locationHeader).toBeVisible({ timeout: 5000 });

    // Verify the "showing data for nearest city" banner is displayed
    const addressBanner = page.locator('text=/Showing data for nearest city to:/');
    await expect(addressBanner).toBeVisible({ timeout: 5000 });

    // Verify the original searched address is shown in the banner
    const originalAddress = page.locator('text=/17 Godfrey Ave/');
    await expect(originalAddress).toBeVisible({ timeout: 5000 });

    // Verify categories are displayed (indicates data loaded successfully)
    const waterQuality = page.locator('text=Water Quality');
    await expect(waterQuality).toBeVisible({ timeout: 5000 });
  });

  test('should handle city search without address resolution', async ({ page }) => {
    // Navigate to app
    await page.goto('https://app.mapyourhealth.info', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Search for a city directly
    const searchInput = page.locator('input').first();
    await searchInput.click();
    await searchInput.fill('New York');

    // Wait for suggestions
    await page.waitForTimeout(2000);

    // Click city suggestion
    const citySuggestion = page.locator('button:has-text("New York, NY")').first();
    await expect(citySuggestion).toBeVisible({ timeout: 10000 });
    await citySuggestion.click();

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Verify city is selected
    await expect(searchInput).toHaveValue(/New York/i, { timeout: 5000 });

    // Verify NO "nearest city" banner (direct city selection)
    const addressBanner = page.locator('text=/Showing data for nearest city to:/');
    await expect(addressBanner).not.toBeVisible({ timeout: 2000 });

    // Verify categories are displayed
    const waterQuality = page.locator('text=Water Quality');
    await expect(waterQuality).toBeVisible({ timeout: 5000 });
  });
});
