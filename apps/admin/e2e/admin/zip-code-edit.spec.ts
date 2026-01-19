import { test, expect } from '@playwright/test';
import { testUrls, adminCredentials, testZipCodes } from '../fixtures/test-data';

/**
 * Admin: Zip Code Management Tests
 *
 * Tests for the admin portal zip code management functionality.
 * These tests require admin credentials to be set via environment variables:
 * - ADMIN_TEST_EMAIL
 * - ADMIN_TEST_PASSWORD
 */

// Check if real credentials are configured
const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

test.describe('Admin: Zip Code Management', () => {
  // Skip all tests in this describe block if credentials aren't configured
  test.skip(!hasRealCredentials, 'Skipping - requires ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD env vars');

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${testUrls.admin}/login`);

    // Fill login form
    await page.fill('input#email', adminCredentials.email);
    await page.fill('input#password', adminCredentials.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for redirect to dashboard
    await page.waitForURL(`${testUrls.admin}/`, { timeout: 30000 });
  });

  test('can access zip codes page', async ({ page }) => {
    // Navigate to zip codes page
    await page.goto(`${testUrls.admin}/zip-codes`);

    // Verify the page loaded
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/zip/i, {
      timeout: 10000,
    });
  });

  test('can view zip code detail page', async ({ page }) => {
    // Navigate directly to a zip code detail page
    await page.goto(`${testUrls.admin}/zip-codes/${testZipCodes.default}`);

    // Verify the page shows the zip code
    await expect(page.getByText(testZipCodes.default)).toBeVisible({ timeout: 10000 });

    // Verify "Safety Stats" section is visible
    await expect(page.getByText('Safety Stats')).toBeVisible();
  });

  test('can open add stat dialog', async ({ page }) => {
    // Navigate to zip code detail page
    await page.goto(`${testUrls.admin}/zip-codes/${testZipCodes.default}`);
    await expect(page.getByText('Safety Stats')).toBeVisible({ timeout: 10000 });

    // Click "Add Stat" button
    const addButton = page.getByRole('button', { name: /add stat/i });

    // Button might be disabled if all stats are already added
    const isDisabled = await addButton.isDisabled();
    if (!isDisabled) {
      await addButton.click();

      // Verify dialog opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Add Stat Value')).toBeVisible();
    }
  });

  test('displays stat table when stats exist', async ({ page }) => {
    // Navigate to zip code detail page
    await page.goto(`${testUrls.admin}/zip-codes/${testZipCodes.default}`);

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Check if stats table exists (or empty state message)
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page
      .getByText('No stats for this zip code yet')
      .isVisible()
      .catch(() => false);

    // Either table or empty state should be visible
    expect(hasTable || hasEmptyState).toBe(true);
  });
});

test.describe('Admin: Authentication', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    // Try to access protected page directly
    await page.goto(`${testUrls.admin}/zip-codes`);

    // Should be redirected to login
    await expect(page).toHaveURL(/.*login.*/, { timeout: 10000 });
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto(`${testUrls.admin}/login`);

    // Verify login form elements
    await expect(page.getByText('MapYourHealth Admin')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto(`${testUrls.admin}/login`);

    // Fill with invalid credentials
    await page.fill('input#email', 'invalid@example.com');
    await page.fill('input#password', 'wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should show error message
    await expect(page.locator('.text-red-600, [class*="error"]')).toBeVisible({
      timeout: 10000,
    });
  });
});
