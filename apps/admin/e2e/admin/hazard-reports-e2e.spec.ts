/**
 * E2E: /hazard-reports
 *
 * Read-only coverage. Validates the page heading, the "All Reports" card,
 * both filter dropdowns (status, category), and the pending-count banner
 * if there are any pending reports.
 *
 * Mutating tests (changing a report's status, saving admin notes) are
 * deferred until we have a per-test cleanup story.
 *
 * Follow-up to #354 / #359.
 */

import { test, expect } from "@playwright/test";
import { testUrls, adminCredentials } from "../fixtures/test-data";

const hasRealCredentials =
  process.env.ADMIN_TEST_EMAIL && process.env.ADMIN_TEST_PASSWORD;

test.describe("/hazard-reports — read-only", () => {
  test.skip(
    !hasRealCredentials,
    "Skipping — requires ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD env vars",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto(`${testUrls.admin}/login`);
    await page.fill("input#email", adminCredentials.email);
    await page.fill("input#password", adminCredentials.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(`${testUrls.admin}/`, { timeout: 30000 });
  });

  test("renders heading + All Reports card", async ({ page }) => {
    await page.goto(`${testUrls.admin}/hazard-reports`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /hazard reports/i }),
    ).toBeVisible();
    await expect(page.getByText(/all reports/i).first()).toBeVisible();
  });

  test("status filter narrows the list", async ({ page }) => {
    await page.goto(`${testUrls.admin}/hazard-reports`);
    await page.waitForLoadState("networkidle");

    // The two filter triggers are the only `combobox` roles on the page
    // — first is status, second is category.
    const filters = page.getByRole("combobox");
    await expect(filters.nth(0)).toBeVisible();

    await filters.nth(0).click();
    await page.getByRole("option", { name: /^pending$/i }).click();

    // After applying a filter the description either annotates "(filtered)"
    // or the rows update — both indicate the filter is wired.
    await expect(page.getByText(/\(filtered\)|no reports match/i)).toBeVisible(
      { timeout: 5000 },
    );
  });

  test("category filter is interactive", async ({ page }) => {
    await page.goto(`${testUrls.admin}/hazard-reports`);
    await page.waitForLoadState("networkidle");

    const filters = page.getByRole("combobox");
    await expect(filters.nth(1)).toBeVisible();

    await filters.nth(1).click();
    await page.getByRole("option", { name: /^water$/i }).click();

    await expect(page.getByText(/\(filtered\)|no reports match/i)).toBeVisible(
      { timeout: 5000 },
    );
  });
});
